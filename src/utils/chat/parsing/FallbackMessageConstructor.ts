
/**
 * Handles construction of fallback messages when normal content extraction fails
 */
export class FallbackMessageConstructor {
  /**
   * Construct a fallback message from raw events
   */
  constructFallbackMessage(rawEvents: any[], messageBuffer: string): string | null {
    try {
      console.log("Attempting to construct fallback message from", rawEvents.length, "events");
      
      // First check if we have accumulated content in buffer
      if (messageBuffer && messageBuffer.trim()) {
        console.log("Using buffered content for fallback:", messageBuffer.substring(0, 50));
        return messageBuffer;
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
      
      // Try to extract from delta events with content
      const contentExtractor = new ContentExtractor();
      const contentEvents = rawEvents.filter(event => 
        event.type === 'response.delta' && 
        contentExtractor.extractContentFromDelta(event.data)
      );
      
      if (contentEvents.length > 0) {
        // Construct message from deltas
        let constructedMessage = '';
        contentEvents.forEach(event => {
          const content = contentExtractor.extractContentFromDelta(event.data);
          if (content) constructedMessage += content;
        });
        
        if (constructedMessage) {
          console.log("Successfully constructed message from deltas:", constructedMessage.substring(0, 50));
          return constructedMessage.trim();
        }
      }
      
      // Try to extract from any event type as a last resort
      for (const event of rawEvents) {
        const content = contentExtractor.extractContentFromDelta(event.data);
        if (content) {
          console.log("Found content in unexpected event type:", event.type);
          return content;
        }
      }
      
      console.log("No content found in any events");
      return "I'm sorry, but I couldn't generate a response at this time.";
    } catch (error) {
      console.error("Error constructing fallback message:", error);
      return "I'm sorry, but I couldn't generate a response at this time.";
    }
  }
}
