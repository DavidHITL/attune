
/**
 * Handles accumulation of transcript text over time
 */
export class TranscriptAccumulator {
  private userTranscriptAccumulator: string = '';
  
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
}
