
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
    
    // Log all events but limit console spam
    const isKeyEvent = [
      'session.created', 
      'response.created', 
      'response.done',
      'response.audio_transcript.done',
      'conversation.item.truncated',
      'response.content_part.done',
      'transcript',
      'input_audio_buffer.speech_started',
      'input_audio_buffer.speech_stopped'
    ].includes(event.type);
    
    const eventCount = this.eventCounts[event.type];
    const timestamp = new Date().toISOString();
    
    if (isKeyEvent) {
      console.log(`📊 EVENT [${event.type}] #${eventCount} at ${timestamp}`);
    } else if (eventCount <= 5 || eventCount % 10 === 0) {
      // Log less frequent events or occasionally for repeated events
      console.log(`📊 EVENT [${event.type}] #${eventCount} at ${timestamp}`);
    }
    
    const eventInfo = {
      type: event.type,
      timestamp: Date.now()
    } as {type: string, timestamp: number, contentPreview?: string};
    
    // Add content preview for certain events
    if (event.delta?.content) {
      eventInfo.contentPreview = event.delta.content.substring(0, 30);
      console.log(`📋 Content delta preview: "${eventInfo.contentPreview}..."`);
    } else if (event.transcript?.text) {
      eventInfo.contentPreview = event.transcript.text.substring(0, 30);
      console.log(`📋 Transcript preview: "${eventInfo.contentPreview}..."`);
    } else if (typeof event.transcript === 'string') {
      eventInfo.contentPreview = event.transcript.substring(0, 30);
      console.log(`📋 Direct transcript preview: "${eventInfo.contentPreview}..."`);
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
   * Log general event statistics 
   */
  logEventStats(): void {
    const totalEvents = Object.values(this.eventCounts).reduce((sum, count) => sum + count, 0);
    const uniqueEventTypes = Object.keys(this.eventCounts).length;
    
    console.log(`📊 Event Statistics: ${totalEvents} total events of ${uniqueEventTypes} different types`);
    
    // Get top 5 most frequent event types
    const sortedEvents = Object.entries(this.eventCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5);
    
    console.log('📊 Top 5 most frequent event types:');
    sortedEvents.forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} occurrences`);
    });
  }
}
