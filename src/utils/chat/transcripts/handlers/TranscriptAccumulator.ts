
/**
 * Handles accumulating and tracking transcript pieces
 */
export class TranscriptAccumulator {
  private userTranscript: string = '';
  private lastTranscriptTime: number = 0;
  
  /**
   * Add text to the accumulated transcript
   */
  accumulateText(deltaText: string): void {
    if (deltaText) {
      this.userTranscript += deltaText;
      console.log(`Accumulating user transcript (${this.userTranscript.length} chars): "${this.userTranscript.substring(0, 50)}${this.userTranscript.length > 50 ? '...' : ''}"`);
      this.lastTranscriptTime = Date.now();
    }
  }
  
  /**
   * Reset the transcript accumulator
   */
  reset(): void {
    this.userTranscript = '';
  }
  
  /**
   * Get the current accumulated transcript
   */
  getAccumulatedText(): string {
    return this.userTranscript;
  }
  
  /**
   * Check if the transcript is considered stale based on timing
   */
  isTranscriptStale(staleThresholdMs: number = 1500): boolean {
    return Date.now() - this.lastTranscriptTime > staleThresholdMs;
  }
  
  /**
   * Get last time transcript was updated
   */
  getLastTranscriptTime(): number {
    return this.lastTranscriptTime;
  }
}
