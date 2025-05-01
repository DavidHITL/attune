
/**
 * Handles validation and pre-processing of messages
 */
export class MessageProcessor {
  private minTimeBetweenMessages: number = 500; // ms
  private lastMessageSentTime: number = 0;
  private processedMessages: Set<string> = new Set();
  
  /**
   * Check if content is valid
   */
  isValidContent(content: string): boolean {
    return content && content.trim() !== '';
  }
  
  /**
   * Check if message is a duplicate based on recent activity
   */
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    // Check if we've saved the same message recently (debounce)
    const now = Date.now();
    if (now - this.lastMessageSentTime < this.minTimeBetweenMessages) {
      console.log(`Message received too quickly after previous one, might be duplicate`);
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
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    const contentFingerprint = `${role}:${content.substring(0, 50)}`;
    this.processedMessages.add(contentFingerprint);
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.processedMessages.clear();
  }
}
