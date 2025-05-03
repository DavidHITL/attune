
/**
 * Handles logging and debugging for event messages
 */
export class LoggingHandler {
  private eventCounter: number = 0;

  /**
   * Get structured representation of event for debugging
   */
  getEventStructure(event: any): any {
    try {
      // Create a clean copy without circular references
      return this.sanitizeObject(event);
    } catch (error) {
      return `Error extracting structure: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  /**
   * Sanitize object to avoid circular references and sensitive data
   */
  private sanitizeObject(obj: any, depth = 0, maxDepth = 5): any {
    if (depth >= maxDepth) return "[Max Depth Reached]";
    if (!obj || typeof obj !== 'object') return obj;
    
    const result: any = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        // Skip functions and private props
        if (typeof value === 'function' || key.startsWith('_')) {
          continue;
        }
        
        // Handle Buffer or ArrayBuffer specially
        if (value instanceof ArrayBuffer || 
           (typeof Buffer !== 'undefined' && value instanceof Buffer)) {
          result[key] = `[Binary data: ${value.byteLength} bytes]`;
          continue;
        }
        
        if (typeof value === 'object' && value !== null) {
          result[key] = this.sanitizeObject(value, depth + 1, maxDepth);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Log an event with a unique counter and timestamp
   */
  logEvent(event: any, description: string): number {
    this.eventCounter++;
    const eventId = this.eventCounter;
    const eventTime = new Date().toISOString();
    
    // Log basic event information
    console.log(`[EventHandler] #${eventId} ${description}: ${event.type}`, {
      timestamp: eventTime,
      eventId,
      eventType: event.type
    });

    return eventId;
  }
  
  /**
   * Log potential text content paths in the event structure
   */
  logPotentialTextPaths(event: any, eventId: number): void {
    try {
      // First check direct text properties
      if (event.text) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Direct 'text' property found:`, event.text.substring(0, 100));
      } else if (event.transcript) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Direct 'transcript' property found:`, 
          typeof event.transcript === 'string' 
            ? event.transcript.substring(0, 100) 
            : event.transcript);
      }
      
      // Check deeper paths
      if (event.delta && event.delta.text) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.delta.text' found:`, event.delta.text.substring(0, 100));
      }
      
      if (event.transcript && event.transcript.text) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.transcript.text' found:`, event.transcript.text.substring(0, 100));
      }
      
      if (event.content_part && event.content_part.text) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.content_part.text' found:`, event.content_part.text.substring(0, 100));
      }
      
      // Check for other common paths
      const potentialPaths = [
        'content', 'message', 'audio_transcript', 'transcript_text', 
        'result', 'output', 'data'
      ];
      
      potentialPaths.forEach(path => {
        if (event[path]) {
          if (typeof event[path] === 'string') {
            console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.${path}' found:`, event[path].substring(0, 100));
          } else if (event[path].text) {
            console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.${path}.text' found:`, event[path].text.substring(0, 100));
          }
        }
      });
    } catch (error) {
      console.error(`🎙️ [TEXT PATH] #${eventId} Error logging potential text paths:`, error);
    }
  }
}
