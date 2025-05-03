
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
  
  /**
   * Enhanced deep search that returns both the content and the path
   * where it was found for better tracking and debugging
   */
  deepSearchForTextProperties(obj: any): { found: boolean, content: string, path: string } {
    const textProperties = ['text', 'transcript', 'content', 'message', 'delta'];
    const result = this.recursivePropertySearch(obj, '', textProperties);
    
    if (result.found) {
      console.log(`[TextPropertyFinder] Deep search found text at path '${result.path}': "${result.content.substring(0, 50)}${result.content.length > 50 ? '...' : ''}"`);
    } else {
      console.warn('[TextPropertyFinder] Deep search could not find any text properties');
    }
    
    return result;
  }
  
  /**
   * Recursive helper for deepSearchForTextProperties
   */
  private recursivePropertySearch(
    obj: any, 
    currentPath: string, 
    targetProps: string[], 
    depth: number = 0
  ): { found: boolean, content: string, path: string } {
    // Prevent infinite recursion or excessive depth
    if (depth > 7) {
      return { found: false, content: '', path: '' };
    }
    
    if (!obj || typeof obj !== 'object') {
      return { found: false, content: '', path: '' };
    }
    
    // First check direct string properties that might contain transcript content
    for (const key in obj) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      // Direct string properties that match our target names
      if (typeof obj[key] === 'string' && obj[key].trim() !== '' && 
          (targetProps.includes(key) || key.includes('text') || key.includes('transcript'))) {
        return { 
          found: true, 
          content: obj[key], 
          path: newPath 
        };
      }
    }
    
    // Then search recursive objects
    for (const key in obj) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Prioritize searching objects whose keys match our target properties
        const isPriorityPath = targetProps.some(prop => key.includes(prop));
        
        if (isPriorityPath) {
          const result = this.recursivePropertySearch(obj[key], newPath, targetProps, depth + 1);
          if (result.found) {
            return result;
          }
        }
      }
    }
    
    // Final pass for objects that weren't priority
    for (const key in obj) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const isPriorityPath = targetProps.some(prop => key.includes(prop));
        
        // Skip priority paths as we already checked them
        if (!isPriorityPath) {
          const result = this.recursivePropertySearch(obj[key], newPath, targetProps, depth + 1);
          if (result.found) {
            return result;
          }
        }
      }
    }
    
    return { found: false, content: '', path: '' };
  }
}
