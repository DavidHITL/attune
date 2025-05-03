
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
    return this.eventCounter;
  }
  
  /**
   * Log potential text paths in an event for debugging
   */
  logPotentialTextPaths(event: any, eventId: number): void {
    // Check common paths where text content might be found
    const commonPaths = [
      'transcript',
      'transcript.text',
      'delta.text',
      'content',
      'content_part.text',
      'response.content'
    ];
    
    // Log any found text content
    for (const path of commonPaths) {
      const pathParts = path.split('.');
      let value = event;
      
      // Traverse the path
      for (const part of pathParts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }
      
      // If we found a string value, log it
      if (typeof value === 'string' && value.trim() !== '') {
        console.log(`[EventHandler] #${eventId} Found text at path '${path}': "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
      }
    }
  }
}
