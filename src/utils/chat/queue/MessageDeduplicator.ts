
/**
 * Handles message deduplication
 */
export class MessageDeduplicator {
  private processedMessages = new Set<string>();
  private lastProcessTime = Date.now();
  private minTimeBetweenMessages = 500; // ms
  
  /**
   * Check if a message is a duplicate
   */
  isDuplicate(role: 'user' | 'assistant', content: string): boolean {
    // Time-based debounce check
    const now = Date.now();
    if (now - this.lastProcessTime < this.minTimeBetweenMessages) {
      return true;
    }
    
    // Generate fingerprint for content comparison
    const contentFingerprint = `${role}:${content.replace(/\s+/g, ' ').substring(0, 100)}`;
    return this.processedMessages.has(contentFingerprint);
  }
  
  /**
   * Mark a message as processed
   */
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    // Update last process time
    this.lastProcessTime = Date.now();
    
    // Generate content fingerprint
    const contentFingerprint = `${role}:${content.replace(/\s+/g, ' ').substring(0, 100)}`;
    this.processedMessages.add(contentFingerprint);
  }
  
  /**
   * Clear processed messages
   */
  clear(): void {
    this.processedMessages.clear();
  }
}
