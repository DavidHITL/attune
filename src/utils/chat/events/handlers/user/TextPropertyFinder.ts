
/**
 * Utility class for deeply searching for text properties in event objects
 */

export class TextPropertyFinder {
  /**
   * Deep search for any text property in an object
   */
  findTextProperty(obj: any, depth = 0): string | null {
    // Prevent infinite recursion
    if (depth > 5) return null;
    
    if (!obj || typeof obj !== 'object') return null;
    
    // Direct text properties
    if (typeof obj.text === 'string' && obj.text.trim() !== '') {
      return obj.text;
    }
    
    // Check transcript property
    if (typeof obj.transcript === 'string' && obj.transcript.trim() !== '') {
      return obj.transcript;
    }
    
    // Recursively check nested objects
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const result = this.findTextProperty(obj[key], depth + 1);
          if (result) return result;
        } else if (key.includes('text') && typeof obj[key] === 'string' && obj[key].trim() !== '') {
          return obj[key];
        }
      }
    }
    
    return null;
  }
}
