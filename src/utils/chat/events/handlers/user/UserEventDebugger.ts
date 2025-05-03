
/**
 * Utility to debug and analyze user event structures
 */
export class UserEventDebugger {
  private static instance: UserEventDebugger;
  private lastUserEvent: any = null;
  private lastFoundTextPath: string | null = null;
  private eventCount: number = 0;
  
  constructor() {
    console.log('[UserEventDebugger] Initialized for event structure analysis');
  }
  
  public static getInstance(): UserEventDebugger {
    if (!this.instance) {
      this.instance = new UserEventDebugger();
    }
    return this.instance;
  }
  
  /**
   * Analyze a user event for text content and structure
   */
  analyzeEvent(event: any): void {
    this.eventCount++;
    this.lastUserEvent = event;
    
    console.log(`🔍 [UserEventDebugger] Analyzing event #${this.eventCount} of type: ${event.type}`);
    
    try {
      // Log key event information
      console.log(`🔍 [UserEventDebugger] Event keys:`, Object.keys(event));
      
      // Try to find text content using various strategies
      this.findTextContent(event);
      
    } catch (error) {
      console.error(`🔍 [UserEventDebugger] Error analyzing event:`, error);
    }
  }
  
  /**
   * Try different strategies to find text content in the event
   */
  private findTextContent(event: any): void {
    // Direct properties
    if (this.checkSimplePath(event, 'text')) return;
    if (this.checkSimplePath(event, 'transcript')) return;
    if (this.checkSimplePath(event, 'content')) return;
    if (this.checkSimplePath(event, 'message')) return;
    
    // Nested properties (common patterns)
    if (this.checkNestedPath(event, 'delta', 'text')) return;
    if (this.checkNestedPath(event, 'transcript', 'text')) return;
    if (this.checkNestedPath(event, 'content_part', 'text')) return;
    if (this.checkNestedPath(event, 'audio_transcript', 'text')) return;
    if (this.checkNestedPath(event, 'message', 'content')) return;
    if (this.checkNestedPath(event, 'result', 'text')) return;
    
    // If we get here, we couldn't find a common path
    console.log(`🔍 [UserEventDebugger] No known text path found in event structure.`);
    
    // Try iterating deeper
    this.iterateThroughStructure(event);
  }
  
  /**
   * Check a simple path for text content
   */
  private checkSimplePath(obj: any, path: string): boolean {
    if (obj && typeof obj[path] === 'string' && obj[path].trim() !== '') {
      this.lastFoundTextPath = path;
      console.log(`🔍 [UserEventDebugger] Found text at path '${path}': "${obj[path].substring(0, 50)}${obj[path].length > 50 ? '...' : ''}"`);
      return true;
    }
    return false;
  }
  
  /**
   * Check a nested path for text content
   */
  private checkNestedPath(obj: any, parent: string, child: string): boolean {
    if (obj && obj[parent] && typeof obj[parent][child] === 'string' && obj[parent][child].trim() !== '') {
      this.lastFoundTextPath = `${parent}.${child}`;
      console.log(`🔍 [UserEventDebugger] Found text at path '${parent}.${child}': "${obj[parent][child].substring(0, 50)}${obj[parent][child].length > 50 ? '...' : ''}"`);
      return true;
    }
    return false;
  }
  
  /**
   * Recursively iterate through the structure to find string properties
   */
  private iterateThroughStructure(obj: any, path: string = '', depth: number = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 3) return;
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const currentPath = path ? `${path}.${key}` : key;
        const value = obj[key];
        
        if (typeof value === 'string' && value.trim() !== '' && value.length > 5) {
          console.log(`🔍 [UserEventDebugger] Found potential text at path '${currentPath}': "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
        } else if (typeof value === 'object' && value !== null) {
          this.iterateThroughStructure(value, currentPath, depth + 1);
        }
      }
    }
  }
  
  /**
   * Get information about the last successful text extraction
   */
  getLastFoundPath(): string | null {
    return this.lastFoundTextPath;
  }
  
  /**
   * Clear stored data
   */
  reset(): void {
    this.lastUserEvent = null;
    this.lastFoundTextPath = null;
    this.eventCount = 0;
  }
}
