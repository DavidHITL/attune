
export class ResponseParser {
  private eventLog: {type: string, timestamp: number, contentPreview?: string}[] = [];
  private eventCounts: Record<string, number> = {};
  private rawResponseEvents: any[] = [];
  private assistantMessageBuffer: string = '';
  
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
      // Store content in buffer for certain events
      if (event.type === 'response.delta') {
        this.assistantMessageBuffer += event.delta.content || '';
      }
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
    } else if (event.content) {
      content = event.content;
    } else if (event.response?.output) {
      const messageItems = event.response.output.filter((item: any) => 
        item.type === 'message' && item.role === 'assistant' && item.content
      );
      if (messageItems.length > 0) {
        content = messageItems[0].content;
      }
    }
    
    // Log the extraction path for debugging
    if (content) {
      console.log(`Content extracted: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
    }
    
    return content;
  }
  
  // Extract completed response from done event
  extractCompletedResponseFromDoneEvent(event: any): string | null {
    try {
      console.log(`Extracting from response.done event received:`, JSON.stringify(event).substring(0, 500));
      
      // Check for content in multiple locations
      // 1. Try response.output path first
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
      }
      
      // 2. Try direct transcript paths
      if (event.transcript?.text) {
        return event.transcript.text;
      }
      
      // 3. Try direct content paths
      if (event.text) {
        return event.text;
      }
      
      // 4. Look for content parts in the response
      if (event.response?.content_parts) {
        const textParts = event.response.content_parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('');
          
        if (textParts) {
          return textParts;
        }
      }
      
      // 5. Get response text from truncated conversation item if present
      const truncatedEvent = this.eventLog.find(e => e.type === 'conversation.item.truncated');
      if (truncatedEvent) {
        console.log("Found truncated conversation item, looking for content");
        const rawEvent = this.rawResponseEvents.find(e => 
          e.type === 'conversation.item.truncated' || 
          (e.data && e.data.type === 'conversation.item.truncated')
        );
        
        if (rawEvent && rawEvent.data && rawEvent.data.item && rawEvent.data.item.content) {
          const content = rawEvent.data.item.content;
          if (Array.isArray(content)) {
            return content.map(c => c.text || '').join('');
          } else if (typeof content === 'string') {
            return content;
          }
        }
      }
      
      // If buffer has content, use that as a fallback
      if (this.assistantMessageBuffer) {
        console.log("Using buffered message content:", this.assistantMessageBuffer.substring(0, 50));
        return this.assistantMessageBuffer;
      }
      
      // No content found
      return null;
      
    } catch (error) {
      console.error("Error extracting response from done event:", error);
      // Return buffer as emergency fallback if available
      return this.assistantMessageBuffer || null;
    }
  }
  
  // Last-resort fallback to construct a message
  constructFallbackMessage(rawEvents: any[] = this.rawResponseEvents): string | null {
    try {
      console.log("Attempting to construct fallback message from", rawEvents.length, "events");
      
      // First check if we have accumulated content in buffer
      if (this.assistantMessageBuffer) {
        console.log("Using buffered content for fallback:", this.assistantMessageBuffer.substring(0, 50));
        return this.assistantMessageBuffer;
      }
      
      // Check for content in transcript events
      const transcriptEvents = rawEvents.filter(event => 
        event.type === 'response.audio_transcript.delta' || 
        event.type === 'response.audio_transcript.done'
      );
      
      if (transcriptEvents.length > 0) {
        console.log("Found transcript events, attempting to extract content");
        let transcriptText = '';
        transcriptEvents.forEach(event => {
          if (event.data.transcript?.text) {
            transcriptText += event.data.transcript.text;
          } else if (event.data.delta?.text) {
            transcriptText += event.data.delta.text;
          }
        });
        
        if (transcriptText) {
          console.log("Constructed transcript text:", transcriptText.substring(0, 50));
          return transcriptText;
        }
      }
      
      // Only use delta events with content
      const contentEvents = rawEvents.filter(event => 
        event.type === 'response.delta' && 
        this.extractContentFromDelta(event.data)
      );
      
      if (contentEvents.length === 0) {
        // Try to extract from any event type as a last resort
        for (const event of rawEvents) {
          const content = this.extractContentFromDelta(event.data);
          if (content) {
            console.log("Found content in unexpected event type:", event.type);
            return content;
          }
        }
        
        console.log("No content found in any events");
        return "I'm sorry, but I couldn't generate a response at this time.";
      }
      
      // Construct message from deltas
      let constructedMessage = '';
      contentEvents.forEach(event => {
        const content = this.extractContentFromDelta(event.data);
        if (content) constructedMessage += content;
      });
      
      if (constructedMessage) {
        console.log("Successfully constructed message from deltas:", constructedMessage.substring(0, 50));
      } else {
        console.log("Failed to construct message - no content found");
        constructedMessage = "I'm sorry, but I couldn't generate a response at this time.";
      }
      
      return constructedMessage.trim() || null;
    } catch (error) {
      console.error("Error constructing fallback message:", error);
      return "I'm sorry, but I couldn't generate a response at this time.";
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
    this.assistantMessageBuffer = '';
  }
  
  resetBuffer(): void {
    this.assistantMessageBuffer = '';
  }
}
