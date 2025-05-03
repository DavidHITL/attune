
import { SaveMessageCallback } from '../../../types';
import { Message } from '../../../types';
import { MessageSaveHandlerCore } from './MessageSaveHandlerCore';
import { AdvancedRetryLogic } from './retry/AdvancedRetryLogic';

/**
 * Coordinates message saving operations with multiple strategies
 */
export class MessageSaveHandler {
  private core: MessageSaveHandlerCore;
  private retryLogic: AdvancedRetryLogic;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.core = new MessageSaveHandlerCore(saveMessageCallback);
    this.retryLogic = new AdvancedRetryLogic(this.core);
    
    console.log('[MessageSaveHandler] Initialized with dependencies');
  }
  
  /**
   * Save a message directly to the database
   */
  async saveMessageDirectly(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // Validate role
    if (!this.core.roleValidation.validateRole(role)) {
      throw this.core.roleValidation.createInvalidRoleError(role);
    }
    
    return this.core.saveMessageDirectly(role, content);
  }

  /**
   * Save message with retry capabilities
   */
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    return this.retryLogic.saveMessageWithRetry(role, content);
  }

  /**
   * Show save notification
   */
  showSaveNotification(role: 'user' | 'assistant', content: string) {
    const messageId = `${role}-${Date.now()}`;
    this.core.notifications.showSuccess(role, content, messageId);
  }
  
  /**
   * Content validation
   */
  isValidContent(content: string): boolean {
    return this.core.isValidContent(content);
  }
  
  /**
   * Message tracking functionality
   */
  trackMessageSaveStart(): void {
    this.core.tracking.trackSaveStart();
  }
  
  trackMessageSaveComplete(): void {
    this.core.tracking.trackSaveComplete();
  }
  
  trackPendingUserMessage(messageId: string): void {
    this.core.tracking.trackPendingUserMessage(messageId);
  }
  
  removePendingUserMessage(messageId: string): void {
    this.core.tracking.removePendingUserMessage(messageId);
  }
  
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    if (!this.core.roleValidation.validateRole(role)) {
      this.core.roleValidation.logInvalidRole(role, "markAsProcessed");
      return;
    }
    
    this.core.tracking.markAsProcessed(role, content);
  }
  
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    if (!this.core.roleValidation.validateRole(role)) {
      this.core.roleValidation.logInvalidRole(role, "isDuplicateContent");
      return false;
    }
    
    return this.core.tracking.isDuplicateContent(role, content);
  }
  
  resetProcessedMessages(): void {
    this.core.tracking.resetProcessedMessages();
  }
  
  getActiveMessageSaves(): number {
    return this.core.tracking.getActiveMessageSaves();
  }
  
  getPendingUserMessages(): number {
    return this.core.tracking.getPendingUserMessages();
  }
  
  reportPendingMessages(): void {
    this.core.tracking.reportPendingMessages();
  }
}
