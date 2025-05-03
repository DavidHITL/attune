
/**
 * Stores and manages raw response events
 */
export class ResponseEventStore {
  private rawResponseEvents: any[] = [];
  private assistantMessageBuffer: string = '';
  private processedEvents = new Set<string>();
  
  constructor() {
    // Clean up processed events periodically
    setInterval(() => {
      this.processedEvents.clear();
    }, 300000); // Clear every 5 minutes
  }
  
  /**
   * Store a response event
   */
  storeEvent(event: any): void {
    // Skip if no type
    if (!event || !event.type) {
      return;
    }
    
    // Only store response.* events
    if (event.type.startsWith('response.')) {
      // Generate a fingerprint for deduplication
      const eventFingerprint = this.generateEventFingerprint(event);
      
      // Skip if we've already processed this exact event
      if (this.processedEvents.has(eventFingerprint)) {
        return;
      }
      
      // Mark as processed to prevent duplicates
      this.processedEvents.add(eventFingerprint);
      
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
   * Generate a fingerprint for an event to assist with deduplication
   */
  private generateEventFingerprint(event: any): string {
    // For response.delta events, include the content in fingerprint
    if (event.type === 'response.delta') {
      const content = event.delta?.content || event.delta?.text || '';
      return `${event.type}:${content.substring(0, 50)}`;
    }
    
    // For response.done events, include content when available
    if (event.type === 'response.done') {
      const content = event.response?.content || '';
      return `${event.type}:${content.substring(0, 50)}`;
    }
    
    // For content_part events
    if (event.type === 'response.content_part.done') {
      const content = event.content_part?.text || '';
      return `${event.type}:${content.substring(0, 50)}`;
    }
    
    // For other events, use the event type and timestamp
    return `${event.type}:${Date.now()}`;
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
