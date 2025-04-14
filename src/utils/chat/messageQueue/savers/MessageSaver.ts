
import { Message, SaveMessageCallback } from '../../../types';
import { DirectSaver } from './strategies/DirectSaver';
import { RetrySaver } from './strategies/RetrySaver';
import { SaveOptions } from './core/SaverTypes';
import { ContentValidator } from './strategies/ContentValidator';
import { PendingMessageTracker } from './trackers/PendingMessageTracker';
import { ActiveSavesTracker } from './trackers/ActiveSavesTracker';
import { ProcessedMessagesTracker } from './utils/ProcessedMessagesTracker';

/**
 * Coordinates message saving operations with multiple strategies
 */
export class MessageSaver {
  private directSaver: DirectSaver;
  private retrySaver: RetrySaver;
  private contentValidator: ContentValidator;
  private pendingTracker: PendingMessageTracker;
  private activeSavesTracker: ActiveSavesTracker;
  private processedTracker: ProcessedMessagesTracker;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.directSaver = new DirectSaver(saveMessageCallback);
    this.retrySaver = new RetrySaver(saveMessageCallback);
    this.contentValidator = new ContentValidator();
    this.pendingTracker = new PendingMessageTracker();
    this.activeSavesTracker = new ActiveSavesTracker();
    this.processedTracker = new ProcessedMessagesTracker();
  }

  /**
   * Directly save a message with retry logic
   */
  async saveMessageDirectly(
    role: 'user' | 'assistant', 
    content: string, 
    messageId?: string
  ): Promise<Message | null> {
    // Validate content
    if (!this.contentValidator.isValidContent(content)) {
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
    // Check for duplicate
    if (this.processedTracker.hasProcessed(role, content)) {
      console.log(`Skipping duplicate ${role} message:`, content.substring(0, 50));
      return null;
    }
    
    // Mark as processed to avoid duplicates
    this.processedTracker.markAsProcessed(role, content);
    
    // Track active save
    this.activeSavesTracker.trackSaveStart();
    
    // For user messages with messageId, track as pending
    if (role === 'user' && messageId) {
      this.pendingTracker.trackMessage(messageId);
    }
    
    try {
      // Use direct saver
      const result = await this.directSaver.saveMessage(role, content, { 
        trackId: messageId,
        showNotification: true 
      });
      
      // Update tracking for successful save
      if (role === 'user' && messageId && result.success) {
        this.pendingTracker.untrackMessage(messageId);
      }
      
      return result.savedMessage;
    } catch (error) {
      console.error(`Error in saveMessageDirectly for ${role} message:`, error);
      throw error;
    } finally {
      this.activeSavesTracker.trackSaveComplete();
    }
  }
  
  /**
   * Save message with exponential backoff retry logic
   */
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // Validate content
    if (!this.contentValidator.isValidContent(content)) {
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
    // Check for duplicate
    if (this.processedTracker.hasProcessed(role, content)) {
      console.log(`Skipping duplicate ${role} message in retry:`, content.substring(0, 50));
      return null;
    }
    
    // Mark as processed to avoid duplicates
    this.processedTracker.markAsProcessed(role, content);
    
    // Track active save
    this.activeSavesTracker.trackSaveStart();
    
    try {
      // Use retry saver
      const result = await this.retrySaver.saveMessage(role, content);
      return result.savedMessage;
    } catch (error) {
      console.error(`Error in saveMessageWithRetry for ${role} message:`, error);
      return null;
    } finally {
      this.activeSavesTracker.trackSaveComplete();
    }
  }
  
  /**
   * Track a pending user message
   */
  trackPendingUserMessage(messageId: string): void {
    this.pendingTracker.trackMessage(messageId);
  }
  
  /**
   * Check if content is a duplicate
   */
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    return this.processedTracker.hasProcessed(role, content);
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.processedTracker.reset();
    this.activeSavesTracker.reset();
  }
  
  /**
   * Get current active save count
   */
  getActiveMessageSaves(): number {
    return this.activeSavesTracker.getActiveCount();
  }
  
  /**
   * Get pending user messages count
   */
  getPendingUserMessages(): number {
    return this.pendingTracker.getPendingCount();
  }
  
  /**
   * Report any pending user messages that never completed
   */
  reportPendingMessages(): void {
    this.pendingTracker.reportPendingMessages();
  }
}
