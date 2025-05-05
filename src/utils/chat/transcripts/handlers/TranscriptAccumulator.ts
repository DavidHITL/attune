
/**
 * Handles accumulating and tracking transcript pieces
 */
export class TranscriptAccumulator {
  private userTranscript: string = '';
  private lastTranscriptTime: number = 0;
  private lastDeltaTime: number = 0;
  private debugId: string;
  private accumulationCount: number = 0;
  private significantChangeDetected: boolean = false;
  private lastContentHash: string = '';
  
  constructor() {
    this.debugId = `TA-${Date.now().toString(36)}`;
    console.log(`[TranscriptAccumulator ${this.debugId}] Initialized`);
  }
  
  /**
   * Simple string hash for change detection
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * Add text to the accumulated transcript
   */
  accumulateText(deltaText: string): void {
    if (deltaText) {
      this.accumulationCount++;
      const prevLength = this.userTranscript.length;
      this.userTranscript += deltaText;
      this.lastDeltaTime = Date.now();
      
      // Check if this is a significant change
      const newContentHash = this.simpleHash(this.userTranscript);
      if (newContentHash !== this.lastContentHash) {
        this.significantChangeDetected = true;
        this.lastContentHash = newContentHash;
      }
      
      console.log(`[TranscriptAccumulator ${this.debugId}] #${this.accumulationCount} Accumulated text: "${deltaText}" (${deltaText.length} chars)`, {
        previousTotalLength: prevLength,
        newTotalLength: this.userTranscript.length,
        deltaLength: deltaText.length,
        totalAccumulations: this.accumulationCount,
        significantChange: this.significantChangeDetected,
        timestamp: new Date(this.lastDeltaTime).toISOString(),
        contentPreview: this.userTranscript.substring(0, 50) + (this.userTranscript.length > 50 ? '...' : '')
      });
      
      // Reset the significant change flag after logging
      this.significantChangeDetected = false;
    }
  }
  
  /**
   * Set or update transcript directly 
   */
  setTranscript(text: string): void {
    if (text && this.userTranscript !== text) {
      const oldText = this.userTranscript;
      this.userTranscript = text;
      this.lastTranscriptTime = Date.now();
      
      // Update content hash
      this.lastContentHash = this.simpleHash(text);
      
      console.log(`[TranscriptAccumulator ${this.debugId}] Set full transcript (${text.length} chars): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, {
        oldLength: oldText.length,
        newLength: text.length,
        changed: text !== oldText,
        timestamp: new Date(this.lastTranscriptTime).toISOString(),
        oldPreview: oldText.length > 0 ? `${oldText.substring(0, 30)}...` : '(empty)',
        newPreview: text.length > 0 ? `${text.substring(0, 30)}...` : '(empty)'
      });
    }
  }
  
  /**
   * Reset the transcript accumulator
   */
  reset(): void {
    const hadContent = this.userTranscript.trim().length > 0;
    const contentPreview = this.userTranscript.substring(0, 50);
    const contentLength = this.userTranscript.length;
    
    this.userTranscript = '';
    this.lastTranscriptTime = 0;
    this.lastDeltaTime = 0;
    this.lastContentHash = '';
    
    console.log(`[TranscriptAccumulator ${this.debugId}] Resetting transcript`, {
      hadContent,
      contentLength,
      contentPreview: hadContent ? contentPreview + (contentLength > 50 ? '...' : '') : '(empty)',
      accumulationCount: this.accumulationCount,
      timestamp: new Date().toISOString()
    });
    
    // Reset the accumulation counter
    this.accumulationCount = 0;
  }
  
  /**
   * Get the current accumulated transcript
   */
  getAccumulatedText(): string {
    return this.userTranscript;
  }
  
  /**
   * Get the timestamp of the last transcript update
   */
  getLastTranscriptTime(): number {
    return Math.max(this.lastTranscriptTime, this.lastDeltaTime);
  }
  
  /**
   * Check if the transcript is considered stale based on timing
   */
  isTranscriptStale(staleThresholdMs: number = 1000): boolean {
    const timeSinceLastUpdate = Date.now() - this.getLastTranscriptTime();
    const isStale = timeSinceLastUpdate > staleThresholdMs;
    
    if (isStale && this.userTranscript.trim() !== '') {
      console.log(`[TranscriptAccumulator ${this.debugId}] Transcript is stale (${timeSinceLastUpdate}ms since last update)`, {
        contentLength: this.userTranscript.length,
        contentPreview: this.userTranscript.substring(0, 50) + (this.userTranscript.length > 50 ? '...' : ''),
        lastUpdateTime: new Date(this.getLastTranscriptTime()).toISOString(),
        currentTime: new Date().toISOString(),
        staleThresholdMs
      });
    }
    
    return isStale;
  }
  
  /**
   * Check if there is meaningful content
   */
  hasContent(): boolean {
    const hasContent = this.userTranscript.trim().length > 0;
    
    if (this.accumulationCount > 0 && !hasContent) {
      console.log(`[TranscriptAccumulator ${this.debugId}] Warning: ${this.accumulationCount} accumulations but no meaningful content`);
    }
    
    return hasContent;
  }
  
  /**
   * Get detailed debug information about the current state
   */
  getDebugInfo(): object {
    return {
      id: this.debugId,
      contentLength: this.userTranscript.length,
      contentWords: this.userTranscript.trim().split(/\s+/).length,
      hasContent: this.hasContent(),
      accumulationCount: this.accumulationCount,
      lastTranscriptTime: this.lastTranscriptTime > 0 ? new Date(this.lastTranscriptTime).toISOString() : 'never',
      lastDeltaTime: this.lastDeltaTime > 0 ? new Date(this.lastDeltaTime).toISOString() : 'never',
      contentHash: this.lastContentHash,
      contentPreview: this.userTranscript.substring(0, 100) + (this.userTranscript.length > 100 ? '...' : '')
    };
  }
}
