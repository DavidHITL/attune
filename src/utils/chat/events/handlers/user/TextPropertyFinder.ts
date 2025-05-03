
/**
 * Utility class for deeply searching for text properties in event objects
 */

export class TextPropertyFinder {
  private searchCount: number = 0;
  
  constructor() {
    console.log('[TextPropertyFinder] Initialized');
  }
  
  /**
   * Deep search for any text property in an object
   */
  findTextProperty(obj: any, depth = 0): string | null {
    this.searchCount++;
    const searchId = this.searchCount;
    
    // Prevent infinite recursion
    if (depth > 5) {
      console.log(`[TextPropertyFinder] #${searchId} Max depth (5) reached, stopping recursion`);
      return null;
    }
    
    if (!obj || typeof obj !== 'object') {
      if (depth === 0) {
        console.log(`[TextPropertyFinder] #${searchId} Invalid object provided for search`);
      }
      return null;
    }
    
    // Direct text properties
    if (typeof obj.text === 'string' && obj.text.trim() !== '') {
      console.log(`[TextPropertyFinder] #${searchId} Found direct 'text' property at depth ${depth}: "${obj.text.substring(0, 30)}${obj.text.length > 30 ? '...' : ''}"`);
      return obj.text;
    }
    
    // Check transcript property
    if (typeof obj.transcript === 'string' && obj.transcript.trim() !== '') {
      console.log(`[TextPropertyFinder] #${searchId} Found direct 'transcript' property at depth ${depth}: "${obj.transcript.substring(0, 30)}${obj.transcript.length > 30 ? '...' : ''}"`);
      return obj.transcript;
    }
    
    // Track nested property paths for debugging
    const foundPaths: string[] = [];
    
    // Recursively check nested objects
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const result = this.findTextProperty(obj[key], depth + 1);
          if (result) {
            console.log(`[TextPropertyFinder] #${searchId} Found text in nested property '${key}' at depth ${depth+1}: "${result.substring(0, 30)}${result.length > 30 ? '...' : ''}"`);
            return result;
          }
          
          // Track searched paths
          foundPaths.push(key);
        } else if (key.includes('text') && typeof obj[key] === 'string' && obj[key].trim() !== '') {
          console.log(`[TextPropertyFinder] #${searchId} Found text-like property '${key}' at depth ${depth}: "${obj[key].substring(0, 30)}${obj[key].length > 30 ? '...' : ''}"`);
          return obj[key];
        }
      }
    }
    
    // Only log failure at the top level
    if (depth === 0) {
      console.log(`[TextPropertyFinder] #${searchId} No text property found in object. Searched paths: ${foundPaths.join(', ')}`);
    }
    
    return null;
  }
}
