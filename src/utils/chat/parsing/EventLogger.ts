
/**
 * Handles logging and tracking of events
 */
export class EventLogger {
  private eventLog: {type: string, timestamp: number, contentPreview?: string}[] = [];
  private eventCounts: Record<string, number> = {};
  private sequence: number = 0;
  
  /**
   * Log and track event for debugging purposes
   */
  logEvent(event: any): void {
    this.sequence++;
    
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
      console.log(`EVENT #${this.sequence} [${event.type}] #${this.eventCounts[event.type]} at ${new Date().toISOString()}`);
    }
    
    const eventInfo = {
      type: event.type,
      timestamp: Date.now()
    } as {type: string, timestamp: number, contentPreview?: string};
    
    // Add content preview for certain events
    if (event.delta?.content) {
      eventInfo.contentPreview = event.delta.content.substring(0, 30);
      console.log(`EVENT #${this.sequence} [${event.type}] Content preview: "${eventInfo.contentPreview}..."`);
    } else if (event.transcript?.text) {
      eventInfo.contentPreview = event.transcript.text.substring(0, 30);
      console.log(`EVENT #${this.sequence} [${event.type}] Transcript preview: "${eventInfo.contentPreview}..."`);
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
  
  /**
   * Generate a summary of events processed
   */
  getEventSummary(): string {
    const totalEvents = Object.values(this.eventCounts).reduce((a, b) => a + b, 0);
    const typeCount = Object.keys(this.eventCounts).length;
    
    let summary = `Processed ${totalEvents} events of ${typeCount} different types.\n`;
    summary += `Most common events:\n`;
    
    const sortedEvents = Object.entries(this.eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    sortedEvents.forEach(([type, count]) => {
      summary += `- ${type}: ${count}\n`;
    });
    
    return summary;
  }
}

