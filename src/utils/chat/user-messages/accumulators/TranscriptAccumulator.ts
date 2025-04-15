
/**
 * Handles accumulation of transcript text over time
 */
export class TranscriptAccumulator {
  private userTranscriptAccumulator: string = '';
  private lastSaveTimestamp: number = 0;
  private minSaveIntervalMs: number = 2000; // Don't save more often than every 2 seconds
  
  /**
   * Add content to transcript accumulator
   */
  accumulateTranscript(text: string): void {
    if (text === '') {
      // Reset accumulator
      this.userTranscriptAccumulator = '';
      return;
    }
    
    if (text && text.trim()) {
      this.userTranscriptAccumulator += text;
      console.log(`Accumulating user transcript (${this.userTranscriptAccumulator.length} chars): "${this.userTranscriptAccumulator.substring(0, 30)}${this.userTranscriptAccumulator.length > 30 ? "..." : ""}"`);
    }
  }
  
  /**
   * Get accumulated transcript
   */
  getAccumulatedTranscript(): string {
    return this.userTranscriptAccumulator;
  }
  
  /**
   * Clear accumulated transcript
   */
  clearAccumulatedTranscript(): void {
    this.userTranscriptAccumulator = '';
  }
  
  /**
   * Check if transcript is non-empty
   */
  hasContent(): boolean {
    return !!this.userTranscriptAccumulator && this.userTranscriptAccumulator.trim() !== '';
  }
  
  /**
   * Check if enough time has passed since last save
   */
  canSaveNow(): boolean {
    const now = Date.now();
    const timeSinceLastSaveMs = now - this.lastSaveTimestamp;
    
    return timeSinceLastSaveMs >= this.minSaveIntervalMs;
  }
  
  /**
   * Mark as saved
   */
  markAsSaved(): void {
    this.lastSaveTimestamp = Date.now();
  }
}
