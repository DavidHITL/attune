
/**
 * Tracks processed messages to avoid duplicates
 */
export class ProcessedMessagesTracker {
  private processedMessages: Map<string, Set<string>> = new Map();
  
  constructor() {
    // Initialize the map with empty sets for known roles
    this.processedMessages.set('user', new Set<string>());
    this.processedMessages.set('assistant', new Set<string>());
  }
  
  /**
   * Check if a message has been processed
   */
  hasProcessed(role: 'user' | 'assistant', content: string): boolean {
    const processedForRole = this.processedMessages.get(role);
    return processedForRole ? processedForRole.has(this.normalizeContent(content)) : false;
  }
  
  /**
   * Mark a message as processed
   */
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    const processedForRole = this.processedMessages.get(role);
    if (processedForRole) {
      processedForRole.add(this.normalizeContent(content));
    } else {
      // Initialize for this role if not already done
      this.processedMessages.set(role, new Set([this.normalizeContent(content)]));
    }
  }
  
  /**
   * Reset processed message tracking
   */
  reset(): void {
    this.processedMessages.clear();
    this.processedMessages.set('user', new Set<string>());
    this.processedMessages.set('assistant', new Set<string>());
  }
  
  /**
   * Normalize content for comparison
   */
  normalizeContent(content: string): string {
    return content.trim().toLowerCase();
  }

  /**
   * Alias of reset() for backward compatibility
   */
  resetTracking(): void {
    this.reset();
  }
  
  /**
   * Check if content is a duplicate
   */
  isDuplicate(role: 'user' | 'assistant', content: string): boolean {
    return this.hasProcessed(role, content);
  }
}
