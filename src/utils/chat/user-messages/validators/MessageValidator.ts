
/**
 * Validates user messages
 */
export class MessageValidator {
  private processedMessages: Set<string> = new Set();
  
  /**
   * Check if a message is valid (not empty)
   */
  isValidMessage(content: string): boolean {
    return !!content && content.trim() !== '';
  }
  
  /**
   * Check if a message appears to be a duplicate
   */
  isDuplicate(content: string): boolean {
    // Skip empty messages
    if (!content || content.trim() === '') {
      return false;
    }
    
    // Create fingerprint from first part of content
    const messageFingerprint = content.substring(0, 50);
    return this.processedMessages.has(messageFingerprint);
  }
  
  /**
   * Mark a message as processed to prevent duplicates
   */
  markAsProcessed(content: string): void {
    if (content && content.trim() !== '') {
      const messageFingerprint = content.substring(0, 50);
      this.processedMessages.add(messageFingerprint);
    }
  }
  
  /**
   * Clean up processed messages to prevent memory leaks
   */
  cleanup(maxEntries: number = 25): void {
    if (this.processedMessages.size > maxEntries) {
      const toRemove = Array.from(this.processedMessages).slice(0, this.processedMessages.size - maxEntries);
      toRemove.forEach(msg => this.processedMessages.delete(msg));
    }
  }
  
  /**
   * Get count of processed messages
   */
  getCount(): number {
    return this.processedMessages.size;
  }
}
