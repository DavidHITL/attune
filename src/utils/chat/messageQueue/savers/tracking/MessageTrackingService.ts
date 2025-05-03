
/**
 * Handles tracking of message operations
 */
export class MessageTrackingService {
  private processedMessages = new Set<string>();
  private activeSaves = 0;
  private pendingUserMessages = new Set<string>();
  private messageCounter: { user: number, assistant: number } = { user: 0, assistant: 0 };
  
  /**
   * Track the start of a message save operation
   */
  trackSaveStart(): void {
    this.activeSaves++;
    console.log(`[MessageTrackingService] Active saves increased to ${this.activeSaves}`);
  }
  
  /**
   * Track the completion of a message save operation
   */
  trackSaveComplete(): void {
    this.activeSaves = Math.max(0, this.activeSaves - 1);
    console.log(`[MessageTrackingService] Active saves decreased to ${this.activeSaves}`);
  }
  
  /**
   * Start tracking a pending user message
   */
  trackPendingUserMessage(messageId: string): void {
    this.pendingUserMessages.add(messageId);
    console.log(`[MessageTrackingService] Tracking pending user message: ${messageId}, total: ${this.pendingUserMessages.size}`);
  }
  
  /**
   * Remove a pending user message from tracking
   */
  removePendingUserMessage(messageId: string): void {
    this.pendingUserMessages.delete(messageId);
    console.log(`[MessageTrackingService] Removed pending user message: ${messageId}, remaining: ${this.pendingUserMessages.size}`);
  }
  
  /**
   * Mark a message as processed to avoid duplicates
   */
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    const key = `${role}-${content.substring(0, 20)}`;
    this.processedMessages.add(key);
    console.log(`[MessageTrackingService] Marked as processed: ${role} message with key ${key}, total processed: ${this.processedMessages.size}`);
  }
  
  /**
   * Check if a message is a duplicate
   */
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    const key = `${role}-${content.substring(0, 20)}`;
    const isDuplicate = this.processedMessages.has(key);
    if (isDuplicate) {
      console.log(`[MessageTrackingService] Detected duplicate ${role} message with key ${key}`);
    }
    return isDuplicate;
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    const count = this.processedMessages.size;
    this.processedMessages.clear();
    console.log(`[MessageTrackingService] Reset processed messages tracking (cleared ${count} entries)`);
  }
  
  /**
   * Get number of active saves
   */
  getActiveMessageSaves(): number {
    return this.activeSaves;
  }
  
  /**
   * Get number of pending user messages
   */
  getPendingUserMessages(): number {
    return this.pendingUserMessages.size;
  }
  
  /**
   * Report any pending user messages
   */
  reportPendingMessages(): void {
    if (this.pendingUserMessages.size > 0) {
      console.warn(`[MessageTrackingService] There are ${this.pendingUserMessages.size} pending user messages that were never completed`);
      console.warn(`[MessageTrackingService] Pending message IDs: ${Array.from(this.pendingUserMessages).join(', ')}`);
    }
  }
  
  /**
   * Increment message counter for specific role
   */
  incrementMessageCounter(role: 'user' | 'assistant'): number {
    this.messageCounter[role]++;
    return this.messageCounter[role];
  }
  
  /**
   * Get current count for a role
   */
  getMessageCount(role: 'user' | 'assistant'): number {
    return this.messageCounter[role];
  }
}
