
import { Message, SaveMessageCallback } from '../../../types';
import { StandardSaveStrategy } from './strategies/StandardSaveStrategy';
import { RetrySaveStrategy } from './strategies/RetrySaveStrategy';
import { ContentValidator } from './validators/ContentValidator';
import { RoleValidator } from './validators/RoleValidator';

/**
 * Central coordinator for message saving operations
 */
export class MessageSaver {
  private standardStrategy: StandardSaveStrategy;
  private retryStrategy: RetrySaveStrategy;
  private contentValidator: ContentValidator;
  private roleValidator: RoleValidator;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    // Fix: Remove incorrect constructor arguments
    this.standardStrategy = new StandardSaveStrategy();
    this.retryStrategy = new RetrySaveStrategy();
    this.contentValidator = new ContentValidator();
    this.roleValidator = new RoleValidator();
    
    console.log('[MessageSaver] Initialized with dependencies');
  }

  /**
   * Save a message directly with standard strategy
   */
  async saveMessageDirectly(
    role: 'user' | 'assistant', 
    content: string, 
    messageId?: string
  ): Promise<Message | null> {
    // Validate role
    if (!this.roleValidator.isValidRole(role)) {
      throw this.roleValidator.createInvalidRoleError(role);
    }
    
    // Validate content
    if (!this.contentValidator.isValidContent(content)) {
      console.log(`[MessageSaver] Skipping empty ${role} message`);
      return null;
    }
    
    console.log(`[MessageSaver] Direct save for ${role} message:`, {
      contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
      hasMessageId: !!messageId
    });
    
    return this.standardStrategy.saveMessage(role, content, { 
      messageId, 
      showNotification: true 
    });
  }
  
  /**
   * Save a message with retry capability
   */
  async saveMessageWithRetry(
    role: 'user' | 'assistant', 
    content: string
  ): Promise<Message | null> {
    // Validate role
    if (!this.roleValidator.isValidRole(role)) {
      throw this.roleValidator.createInvalidRoleError(role);
    }
    
    // Validate content
    if (!this.contentValidator.isValidContent(content)) {
      console.log(`[MessageSaver] Skipping empty ${role} message`);
      return null;
    }
    
    console.log(`[MessageSaver] Retry save for ${role} message:`, {
      contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : '')
    });
    
    return this.retryStrategy.saveMessage(role, content, { 
      maxRetries: 3,
      showNotification: true 
    });
  }
  
  /**
   * Track a pending user message
   */
  trackPendingUserMessage(messageId: string): void {
    // Fix: Access messageTracker property correctly via bracket notation since it might be private
    this.standardStrategy['messageTracker'].trackMessage(messageId);
  }
  
  /**
   * Check if content is a duplicate
   */
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    // Fix: Access contentProcessor property correctly via bracket notation since it might be private
    return this.standardStrategy['contentProcessor'].isDuplicate(role, content);
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.standardStrategy.resetProcessedTracking();
    this.retryStrategy.resetProcessedTracking();
  }
  
  /**
   * Get current active save count
   */
  getActiveMessageSaves(): number {
    return this.standardStrategy.getActiveSavesCount();
  }
  
  /**
   * Get pending user messages count
   */
  getPendingUserMessages(): number {
    return this.standardStrategy.getPendingCount();
  }
  
  /**
   * Report any pending user messages that never completed
   */
  reportPendingMessages(): void {
    this.standardStrategy.reportPendingMessages();
  }
}
