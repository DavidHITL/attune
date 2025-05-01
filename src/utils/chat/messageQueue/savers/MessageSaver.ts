
import { Message, SaveMessageCallback } from '../../../types';
import { toast } from 'sonner';
import { MessageSaveStrategy } from './MessageSaveStrategy';
import { MessageProcessor } from '../savers/processors/MessageProcessor';
import { MessageTracker } from '../savers/trackers/MessageTracker';

/**
 * Handles the actual saving of messages with retry logic
 */
export class MessageSaver {
  private messageTracker: MessageTracker;
  private messageProcessor: MessageProcessor;
  private messageSaveStrategy: MessageSaveStrategy;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.messageTracker = new MessageTracker();
    this.messageProcessor = new MessageProcessor();
    this.messageSaveStrategy = new MessageSaveStrategy(saveMessageCallback);
  }

  /**
   * Directly save a message with retry logic
   */
  async saveMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string): Promise<Message | null> {
    // Skip empty messages
    if (!this.messageProcessor.isValidContent(content)) {
      console.log(`[MessageSaver] 🚫 Skipping empty ${role} message`);
      return null;
    }
    
    // CRITICAL FIX: Validate role is either 'user' or 'assistant'
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaver] ❌ Invalid role provided: "${role}". Must be 'user' or 'assistant'. Aborting save.`);
      return null;
    }
    
    console.log(`[MessageSaver] 💾 Saving message for role: ${role}, content: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}", messageId: ${messageId || 'none'}`);
    
    // Check for duplicate content
    if (this.messageProcessor.isDuplicateContent(role, content)) {
      console.log(`[MessageSaver] 🔄 Skipping duplicate ${role} message:`, content.substring(0, 50));
      return null;
    }
    
    // Mark message as being processed
    this.messageProcessor.markAsProcessed(role, content);
    this.messageTracker.trackMessageSaveStart();
    
    // For user messages with messageId, track as pending
    if (role === 'user' && messageId) {
      this.messageTracker.trackPendingUserMessage(messageId);
      console.log(`[MessageSaver] 🔍 Tracking pending user message with ID: ${messageId}`);
    }
    
    try {
      // Use direct save strategy
      console.log(`[MessageSaver] ⏳ Starting direct save for ${role} message...`);
      const savedMessage = await this.messageSaveStrategy.saveWithDirectStrategy(role, content, messageId);
      
      // Update tracking for successful save
      if (role === 'user' && messageId) {
        this.messageTracker.removePendingUserMessage(messageId);
        console.log(`[MessageSaver] ✅ Completed and removed tracking for user message ID: ${messageId}`);
      }
      
      // Log successful save with role for debugging
      if (savedMessage) {
        console.log(`[MessageSaver] ✅ Successfully saved ${role} message with ID: ${savedMessage.id}, conversation: ${savedMessage.conversation_id || 'unknown'}`);
      } else {
        console.warn(`[MessageSaver] ⚠️ Save completed but no message returned for ${role}`);
      }
      
      return savedMessage;
    } catch (error) {
      console.error(`[MessageSaver] ❌ Error in saveMessageDirectly for ${role} message:`, error);
      throw error;
    } finally {
      this.messageTracker.trackMessageSaveComplete();
      console.log(`[MessageSaver] 🏁 Save operation completed for ${role} message`);
    }
  }
  
  /**
   * Save message with exponential backoff retry logic
   */
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // Skip empty messages
    if (!this.messageProcessor.isValidContent(content)) {
      console.log(`[MessageSaver] 🚫 Skipping empty ${role} message in retry`);
      return null;
    }
    
    // CRITICAL FIX: Validate role is either 'user' or 'assistant'
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaver] ❌ Invalid role provided: "${role}". Must be 'user' or 'assistant'. Aborting retry save.`);
      return null;
    }
    
    console.log(`[MessageSaver] 🔄 Starting retry save for role: ${role}, content: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
    
    // Check for duplicate content
    if (this.messageProcessor.isDuplicateContent(role, content)) {
      console.log(`[MessageSaver] 🔄 Skipping duplicate ${role} message in retry:`, content.substring(0, 50));
      return null;
    }
    
    // Mark message as being processed
    this.messageProcessor.markAsProcessed(role, content);
    this.messageTracker.trackMessageSaveStart();
    
    try {
      // Use retry save strategy
      console.log(`[MessageSaver] ⏳ Starting retry strategy for ${role} message...`);
      const savedMessage = await this.messageSaveStrategy.saveWithRetryStrategy(role, content);
      
      // Log successful save with role for debugging
      if (savedMessage) {
        console.log(`[MessageSaver] ✅ Successfully saved ${role} message with retry, ID: ${savedMessage.id}`);
      } else {
        console.warn(`[MessageSaver] ⚠️ Retry completed but no message returned for ${role}`);
      }
      
      return savedMessage;
    } catch (error) {
      console.error(`[MessageSaver] ❌ Error in saveMessageWithRetry for ${role} message:`, error);
      return null;
    } finally {
      this.messageTracker.trackMessageSaveComplete();
      console.log(`[MessageSaver] 🏁 Retry operation completed for ${role} message`);
    }
  }
  
  /**
   * Track a pending user message
   */
  trackPendingUserMessage(messageId: string): void {
    this.messageTracker.trackPendingUserMessage(messageId);
  }
  
  /**
   * Check if content is recent duplicate to avoid saving the same message multiple times
   */
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    return this.messageProcessor.isDuplicateContent(role, content);
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.messageProcessor.resetProcessedMessages();
    this.messageSaveStrategy.resetProcessedMessages();
  }
  
  /**
   * Get current active save count
   */
  getActiveMessageSaves(): number {
    return this.messageTracker.getActiveMessageSaves();
  }
  
  /**
   * Get pending user messages count
   */
  getPendingUserMessages(): number {
    return this.messageTracker.getPendingUserMessages();
  }
  
  /**
   * Report any pending user messages that never completed
   */
  reportPendingMessages(): void {
    this.messageTracker.reportPendingMessages();
  }
}
