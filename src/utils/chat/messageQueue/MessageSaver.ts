
import { Message, SaveMessageCallback } from '../../types';
import { toast } from 'sonner';
import { MessageSaveStrategy } from './savers/MessageSaveStrategy';
import { MessageProcessor } from './savers/MessageProcessor';
import { MessageTracker } from './savers/MessageTracker';

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
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
    // CRITICAL FIX: Throw error for invalid roles instead of silently defaulting
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaver] FATAL ERROR: Invalid role "${role}". Must be 'user' or 'assistant'.`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    console.log(`[MessageSaver] Saving message with VALIDATED role: "${role}"`, {
      role: role,
      contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
      timestamp: new Date().toISOString()
    });
    
    // Check for duplicate content
    if (this.messageProcessor.isDuplicateContent(role, content)) {
      console.log(`Skipping duplicate ${role} message:`, content.substring(0, 50));
      return null;
    }
    
    // Mark message as being processed
    this.messageProcessor.markAsProcessed(role, content);
    this.messageTracker.trackMessageSaveStart();
    
    // For user messages with messageId, track as pending
    if (role === 'user' && messageId) {
      this.messageTracker.trackPendingUserMessage(messageId);
    }
    
    try {
      // Create a clean message object to avoid reference issues
      const messageObj = {
        role: role,
        content: content
      };
      
      // CRITICAL: Restore logging that was accidentally removed
      console.log(`[MessageSaver] ⚠️ PRE-SAVE ROLE CHECK: role="${messageObj.role}"`);
      
      // Use direct save strategy with the clean object
      const savedMessage = await this.messageSaveStrategy.saveWithDirectStrategy(messageObj.role, messageObj.content, messageId);
      
      // Update tracking for successful save
      if (role === 'user' && messageId) {
        this.messageTracker.removePendingUserMessage(messageId);
      }
      
      // Log successful save with role for debugging
      if (savedMessage) {
        console.log(`[MessageSaver] ✅ Successfully saved ${role} message with ID: ${savedMessage.id}, FINAL ROLE: ${savedMessage.role}`);
        
        if (savedMessage.role !== role) {
          console.error(`[MessageSaver] ❌ ROLE MISMATCH DETECTED! Expected="${role}", Actual="${savedMessage.role}"`);
          
          // Add a toast notification for mismatched roles to make the issue visible
          toast.error(`Role mismatch error: Expected=${role}, Actual=${savedMessage.role}`, {
            duration: 5000,
          });
        }
      }
      
      return savedMessage;
    } catch (error) {
      console.error(`Error in saveMessageDirectly for ${role} message:`, error);
      throw error;
    } finally {
      this.messageTracker.trackMessageSaveComplete();
    }
  }
  
  /**
   * Save message with exponential backoff retry logic
   */
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // Skip empty messages
    if (!this.messageProcessor.isValidContent(content)) {
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
    // CRITICAL FIX: Throw error for invalid roles instead of silently defaulting
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaver] FATAL ERROR: Invalid role "${role}". Must be 'user' or 'assistant'.`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    console.log(`[MessageSaver] Saving message with retry, VALIDATED role: "${role}"`, {
      role: role,
      contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : '')
    });
    
    // Check for duplicate content
    if (this.messageProcessor.isDuplicateContent(role, content)) {
      console.log(`Skipping duplicate ${role} message in retry:`, content.substring(0, 50));
      return null;
    }
    
    // Mark message as being processed
    this.messageProcessor.markAsProcessed(role, content);
    this.messageTracker.trackMessageSaveStart();
    
    try {
      // Use retry save strategy with validated role
      const savedMessage = await this.messageSaveStrategy.saveWithRetryStrategy(role, content);
      
      // Log successful save with role for debugging
      if (savedMessage) {
        console.log(`[MessageSaver] ✅ Successfully saved ${role} message with retry, ID: ${savedMessage.id}, FINAL ROLE: ${savedMessage.role}`);
        
        if (savedMessage.role !== role) {
          console.error(`[MessageSaver] ❌ ROLE MISMATCH DETECTED! Expected="${role}", Actual="${savedMessage.role}"`);
          
          // Add a toast notification for mismatched roles to make the issue visible
          toast.error(`Role mismatch error: Expected=${role}, Actual=${savedMessage.role}`, {
            duration: 5000,
          });
        }
      }
      
      return savedMessage;
    } catch (error) {
      console.error(`Error in saveMessageWithRetry for ${role} message:`, error);
      return null;
    } finally {
      this.messageTracker.trackMessageSaveComplete();
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
