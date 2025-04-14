
/**
 * Utility for tracking processed messages to avoid duplicates
 */
export class ProcessedMessagesTracker {
  private processedMessages: Set<string> = new Set();
  
  /**
   * Check if a message has been processed already
   */
  hasProcessed(role: 'user' | 'assistant', content: string): boolean {
    const contentFingerprint = this.generateFingerprint(role, content);
    return this.processedMessages.has(contentFingerprint);
  }
  
  /**
   * Mark a message as processed
   */
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    const contentFingerprint = this.generateFingerprint(role, content);
    this.processedMessages.add(contentFingerprint);
  }
  
  /**
   * Generate a unique fingerprint for a message
   */
  private generateFingerprint(role: 'user' | 'assistant', content: string): string {
    return `${role}:${content.substring(0, 50)}`;
  }
  
  /**
   * Reset processed messages tracking
   */
  reset(): void {
    this.processedMessages.clear();
  }
}
