
/**
 * Handles extraction of content from various event types and formats
 */
export class ContentExtractor {
  /**
   * Extract content from delta event with multiple fallbacks
   */
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
  
  /**
   * Extract completed response from done event
   */
  extractCompletedResponseFromDoneEvent(event: any, eventLog: any[], rawResponseEvents: any[]): string | null {
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
      const truncatedEvent = eventLog.find(e => e.type === 'conversation.item.truncated');
      if (truncatedEvent) {
        console.log("Found truncated conversation item, looking for content");
        const rawEvent = rawResponseEvents.find(e => 
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
      
      // No content found
      return null;
      
    } catch (error) {
      console.error("Error extracting response from done event:", error);
      return null;
    }
  }
}
