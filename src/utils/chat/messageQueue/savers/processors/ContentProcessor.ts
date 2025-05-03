
/**
 * Processes and tracks message content to avoid duplicates
 */
export class ContentProcessor {
  private processedMessages = new Set<string>();
  private lastProcessTime = 0;
  private minTimeBetween = 500; // ms
  
  /**
   * Generate a fingerprint for a message
   */
  private getMessageFingerprint(role: 'user' | 'assistant', content: string): string {
    return `${role}:${content.substring(0, 50)}`;
  }
  
  /**
   * Check if message is a duplicate
   */
  isDuplicate(role: 'user' | 'assistant', content: string): boolean {
    // Time-based debounce check
    const now = Date.now();
    if (now - this.lastProcessTime < this.minTimeBetween) {
      return true;
    }
    
    // Content fingerprint check
    const fingerprint = this.getMessageFingerprint(role, content);
    return this.processedMessages.has(fingerprint);
  }
  
  /**
   * Mark message as processed to prevent duplicates
   */
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    this.lastProcessTime = Date.now();
    const fingerprint = this.getMessageFingerprint(role, content);
    this.processedMessages.add(fingerprint);
  }
  
  /**
   * Reset processed messages tracking
   */
  reset(): void {
    this.processedMessages.clear();
    console.log('ContentProcessor: Reset processed messages tracking');
  }
}
