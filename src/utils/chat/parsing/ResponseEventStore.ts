
/**
 * Stores and manages raw response events
 */
export class ResponseEventStore {
  private rawResponseEvents: any[] = [];
  private assistantMessageBuffer: string = '';
  
  /**
   * Store a response event
   */
  storeEvent(event: any): void {
    // Store raw events for response.* events
    if (event.type.startsWith('response.')) {
      this.rawResponseEvents.push({
        type: event.type,
        timestamp: Date.now(),
        data: event
      });
      
      // Buffer delta content
      if (event.type === 'response.delta' && event.delta?.content) {
        this.assistantMessageBuffer += event.delta.content || '';
      }
      
      // Limit stored events to avoid memory issues
      if (this.rawResponseEvents.length > 100) {
        this.rawResponseEvents.shift();
      }
    }
  }
  
  /**
   * Append content to the message buffer
   */
  appendToBuffer(content: string): void {
    this.assistantMessageBuffer += content;
  }
  
  /**
   * Get all stored response events
   */
  getStoredEvents(): any[] {
    return this.rawResponseEvents;
  }
  
  /**
   * Get assistant message buffer
   */
  getMessageBuffer(): string {
    return this.assistantMessageBuffer;
  }
  
  /**
   * Clear stored events and reset buffer
   */
  clear(): void {
    this.rawResponseEvents = [];
    this.assistantMessageBuffer = '';
  }
  
  /**
   * Reset only the message buffer
   */
  resetBuffer(): void {
    this.assistantMessageBuffer = '';
  }
}
