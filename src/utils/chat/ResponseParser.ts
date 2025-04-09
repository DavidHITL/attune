export class ResponseParser {
  private eventLog: {type: string, timestamp: number, contentPreview?: string}[] = [];
  private eventCounts: Record<string, number> = {};
  private rawResponseEvents: any[] = [];
  
  constructor() {}
  
  // Log event for debugging purposes
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
      'response.audio_transcript.done'
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
    
    // Store raw events for response.* events
    if (event.type.startsWith('response.')) {
      this.rawResponseEvents.push({
        type: event.type,
        timestamp: Date.now(),
        data: event
      });
      
      // Limit stored events to avoid memory issues
      if (this.rawResponseEvents.length > 100) {
        this.rawResponseEvents.shift();
      }
    }
  }
  
  // Extract content from delta event with multiple fallbacks
  extractContentFromDelta(event: any): string | null {
    let content = null;
    
    // Try all possible paths to content
    if (event.delta?.content) {
      content = event.delta.content;
    } else if (event.delta?.item?.content?.[0]?.text) {
      content = event.delta.item.content[0].text;
    } else if (event.delta?.text) {
      content = event.delta.text;
    } else if (typeof event.delta === 'string') {
      content = event.delta;
    }
    
    // Log the extraction path for debugging
    if (content) {
      console.log(`Content extracted from event.delta structure: ${JSON.stringify(event).substring(0, 100)}...`);
    }
    
    return content;
  }
  
  // Extract completed response from done event
  extractCompletedResponseFromDoneEvent(event: any): string | null {
    try {
      // Log the response structure for debugging
      console.log(`Extracting from response.done structure: ${JSON.stringify(event).substring(0, 500)}...`);
      
      // Try to extract from response.items first (most reliable)
      if (event.response?.output) {
        const messageItems = event.response.output.filter((item: any) => 
          item.type === 'message' && item.role === 'assistant'
        );
        
        if (messageItems.length > 0) {
          const latestMessage = messageItems[messageItems.length - 1];
          
          // Handle different content structures
          if (latestMessage.content) {
            if (Array.isArray(latestMessage.content)) {
              return latestMessage.content
                .filter((c: any) => c.type === 'text' || c.text || c.transcript)
                .map((c: any) => c.text || c.transcript || '')
                .join('');
            } else if (typeof latestMessage.content === 'string') {
              return latestMessage.content;
            }
          }
        }
        
        // Try to extract from the first output item's audio transcript
        if (event.response.output[0]?.content?.[0]?.transcript) {
          return event.response.output[0].content[0].transcript;
        }
      }
      
      // Try to extract from a different path
      if (event.text) {
        return event.text;
      }
      
      // Try final parameters
      if (event.transcript?.text) {
        return event.transcript.text;
      }
      
      // No content found
      return null;
      
    } catch (error) {
      console.error("Error extracting response from done event:", error);
      return null;
    }
  }
  
  // Last-resort fallback to construct a message
  constructFallbackMessage(rawEvents: any[] = this.rawResponseEvents): string | null {
    try {
      // Only use delta events with content
      const contentEvents = rawEvents.filter(event => 
        event.type === 'response.delta' && 
        this.extractContentFromDelta(event.data)
      );
      
      if (contentEvents.length === 0) {
        return null;
      }
      
      // Construct message from deltas
      let constructedMessage = '';
      contentEvents.forEach(event => {
        const content = this.extractContentFromDelta(event.data);
        if (content) constructedMessage += content;
      });
      
      return constructedMessage.trim() || null;
    } catch (error) {
      console.error("Error constructing fallback message:", error);
      return null;
    }
  }
  
  // Get debugging information
  getEventCounts(): Record<string, number> {
    return this.eventCounts;
  }
  
  getEventLog(): {type: string, timestamp: number, contentPreview?: string}[] {
    return [...this.eventLog];
  }
  
  clearRawEvents(): void {
    this.rawResponseEvents = [];
  }
}
