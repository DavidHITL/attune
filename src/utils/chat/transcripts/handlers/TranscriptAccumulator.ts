
/**
 * Handles accumulating and tracking transcript pieces
 */
export class TranscriptAccumulator {
  private userTranscript: string = '';
  private lastTranscriptTime: number = 0;
  private lastDeltaTime: number = 0;
  
  /**
   * Add text to the accumulated transcript
   */
  accumulateText(deltaText: string): void {
    if (deltaText) {
      this.userTranscript += deltaText;
      this.lastDeltaTime = Date.now();
      console.log(`[TranscriptAccumulator] Accumulated text (${this.userTranscript.length} chars): "${this.userTranscript.substring(0, 50)}${this.userTranscript.length > 50 ? '...' : ''}"`);
    }
  }
  
  /**
   * Set or update transcript directly 
   */
  setTranscript(text: string): void {
    if (text && this.userTranscript !== text) {
      this.userTranscript = text;
      this.lastTranscriptTime = Date.now();
      console.log(`[TranscriptAccumulator] Set full transcript (${text.length} chars): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    }
  }
  
  /**
   * Reset the transcript accumulator
   */
  reset(): void {
    console.log('[TranscriptAccumulator] Resetting transcript');
    this.userTranscript = '';
    this.lastTranscriptTime = 0;
    this.lastDeltaTime = 0;
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
  isTranscriptStale(staleThresholdMs: number = 1500): boolean {
    const timeSinceLastUpdate = Date.now() - this.getLastTranscriptTime();
    const isStale = timeSinceLastUpdate > staleThresholdMs;
    
    if (isStale && this.userTranscript.trim() !== '') {
      console.log(`[TranscriptAccumulator] Transcript is stale (${timeSinceLastUpdate}ms since last update)`);
    }
    
    return isStale;
  }
  
  /**
   * Check if there is meaningful content
   */
  hasContent(): boolean {
    return this.userTranscript.trim().length > 0;
  }
}
