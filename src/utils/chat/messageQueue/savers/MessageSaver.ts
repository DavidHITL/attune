
import { Message, SaveMessageCallback } from '../../../types';
import { DirectSaver } from './strategies/DirectSaver';
import { RetrySaver } from './strategies/RetrySaver';
import { SaveOptions } from './core/SaverTypes';
import { MessageProcessor } from './processors/MessageProcessor';
import { PendingMessageTracker } from './trackers/PendingMessageTracker';
import { ActiveSavesTracker } from './trackers/ActiveSavesTracker';
import { RoleValidator } from './validators/RoleValidator';

/**
 * Coordinates message saving operations with multiple strategies
 */
export class MessageSaver {
  private directSaver: DirectSaver;
  private retrySaver: RetrySaver;
  private messageProcessor: MessageProcessor;
  private pendingTracker: PendingMessageTracker;
  private activeSavesTracker: ActiveSavesTracker;
  private roleValidator: RoleValidator;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.directSaver = new DirectSaver(saveMessageCallback);
    this.retrySaver = new RetrySaver(saveMessageCallback);
    this.messageProcessor = new MessageProcessor();
    this.pendingTracker = new PendingMessageTracker();
    this.activeSavesTracker = new ActiveSavesTracker();
    this.roleValidator = new RoleValidator();
    
    console.log('[MessageSaver] Initialized with dependencies');
  }

  /**
   * Directly save a message with retry logic
   */
  async saveMessageDirectly(
    role: 'user' | 'assistant', 
    content: string, 
    messageId?: string
  ): Promise<Message | null> {
    // Validate role explicitly
    if (!this.roleValidator.isValidRole(role)) {
      console.error(`[MessageSaver] FATAL ERROR: Invalid role "${role}" in saveMessageDirectly`);
      throw this.roleValidator.createInvalidRoleError(role);
    }
    
    // Validate content
    if (!this.messageProcessor.validateMessage(role, content).valid) {
      console.log(`[MessageSaver] Skipping invalid ${role} message`);
      return null;
    }
    
    // Check for duplicate
    if (this.messageProcessor.isDuplicateContent(role, content)) {
      console.log(`[MessageSaver] Skipping duplicate ${role} message:`, content.substring(0, 50));
      return null;
    }
    
    // Mark as processed to avoid duplicates
    this.messageProcessor.markAsProcessed(role, content);
    
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
      console.error(`[MessageSaver] Error in saveMessageDirectly for ${role} message:`, error);
      throw error;
    } finally {
      this.activeSavesTracker.trackSaveComplete();
    }
  }
  
  /**
   * Save message with exponential backoff retry logic
   */
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // Validate role explicitly
    if (!this.roleValidator.isValidRole(role)) {
      console.error(`[MessageSaver] FATAL ERROR: Invalid role "${role}" in saveMessageWithRetry`);
      throw this.roleValidator.createInvalidRoleError(role);
    }
    
    // Validate content
    if (!this.messageProcessor.validateMessage(role, content).valid) {
      console.log(`[MessageSaver] Skipping invalid ${role} message`);
      return null;
    }
    
    // Check for duplicate
    if (this.messageProcessor.isDuplicateContent(role, content)) {
      console.log(`[MessageSaver] Skipping duplicate ${role} message in retry:`, content.substring(0, 50));
      return null;
    }
    
    // Mark as processed to avoid duplicates
    this.messageProcessor.markAsProcessed(role, content);
    
    // Track active save
    this.activeSavesTracker.trackSaveStart();
    
    try {
      // Use retry saver
      const result = await this.retrySaver.saveMessage(role, content);
      return result.savedMessage;
    } catch (error) {
      console.error(`[MessageSaver] Error in saveMessageWithRetry for ${role} message:`, error);
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
    return this.messageProcessor.isDuplicateContent(role, content);
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.messageProcessor.resetProcessedMessages();
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
