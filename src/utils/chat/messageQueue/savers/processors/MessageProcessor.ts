
import { Message } from '../../../../types';
import { ContentValidator } from '../validators/ContentValidator';
import { RoleValidator } from '../validators/RoleValidator';

/**
 * Handles validation and pre-processing of messages before saving
 */
export class MessageProcessor {
  private contentValidator: ContentValidator;
  private roleValidator: RoleValidator;
  private processedMessages: Set<string> = new Set();
  private minTimeBetweenMessages: number = 500; // ms
  private lastMessageSentTime: number = 0;
  private messageCounters: Map<string, number> = new Map();
  
  constructor() {
    this.contentValidator = new ContentValidator();
    this.roleValidator = new RoleValidator();
  }
  
  /**
   * Validate message content and role
   */
  validateMessage(role: string, content: string): { 
    valid: boolean, 
    reason?: string 
  } {
    // Validate role first
    if (!this.roleValidator.isValidRole(role)) {
      return { 
        valid: false, 
        reason: `Invalid role: "${role}". Must be 'user' or 'assistant'.` 
      };
    }
    
    // Then validate content
    if (!this.contentValidator.isValidContent(content)) {
      return { 
        valid: false, 
        reason: `Empty or invalid content for ${role} message` 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if message is a duplicate based on recent activity
   */
  isDuplicateContent(role: string, content: string): boolean {
    // Check if we've saved the same message recently (debounce)
    const now = Date.now();
    if (now - this.lastMessageSentTime < this.minTimeBetweenMessages) {
      console.log(`[MessageProcessor] Message received too quickly after previous one, might be duplicate`);
      return true;
    }
    
    this.lastMessageSentTime = now;
    
    // Check fingerprint
    const contentFingerprint = `${role}:${content.substring(0, 50)}`;
    return this.processedMessages.has(contentFingerprint);
  }
  
  /**
   * Add message to processed set
   */
  markAsProcessed(role: string, content: string): void {
    const contentFingerprint = `${role}:${content.substring(0, 50)}`;
    this.processedMessages.add(contentFingerprint);
    
    // Track message count by role
    const count = (this.messageCounters.get(role) || 0) + 1;
    this.messageCounters.set(role, count);
    
    console.log(`[MessageProcessor] Marked ${role} message #${count} as processed`);
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.processedMessages.clear();
    console.log('[MessageProcessor] Reset processed messages tracking');
  }
  
  /**
   * Get the current count for a role
   */
  getMessageCount(role: string): number {
    return this.messageCounters.get(role) || 0;
  }
}
