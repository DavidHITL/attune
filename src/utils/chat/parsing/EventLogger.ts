/**
 * Handles logging and tracking of events
 */
export class EventLogger {
  private eventLog: {type: string, timestamp: number, contentPreview?: string}[] = [];
  private eventCounts: Record<string, number> = {};
  
  /**
   * Log and track event for debugging purposes
   */
  logEvent(event: any): void {
    // Count event types
    if (!this.eventCounts[event.type]) {
      this.eventCounts[event.type] = 0;
    }
    this.eventCounts[event.type]++;
    
    // Log only key events to avoid console spam
    const keyEvents = [
      'session.created', 
      'response.created', 
      'response.done',
      'response.audio_transcript.done',
      'conversation.item.truncated',
      'response.content_part.done'
    ];
    
    if (keyEvents.includes(event.type)) {
      console.log(`EVENT [${event.type}] #${this.eventCounts[event.type]} at ${new Date().toISOString()}`);
    }
    
    const eventInfo = {
      type: event.type,
      timestamp: Date.now()
    } as {type: string, timestamp: number, contentPreview?: string};
    
    // Add content preview for certain events
    if (event.delta?.content) {
      eventInfo.contentPreview = event.delta.content.substring(0, 30);
    } else if (event.transcript?.text) {
      eventInfo.contentPreview = event.transcript.text.substring(0, 30);
    }
    
    this.eventLog.push(eventInfo);
    
    // Keep event log from growing too large
    if (this.eventLog.length > 100) {
      this.eventLog.shift();
    }
  }
  
  /**
   * Get all logged events
   */
  getEventLog(): {type: string, timestamp: number, contentPreview?: string}[] {
    return [...this.eventLog];
  }
  
  /**
   * Get event count statistics
   */
  getEventCounts(): Record<string, number> {
    return this.eventCounts;
  }
}
