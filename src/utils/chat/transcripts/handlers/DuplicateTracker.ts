
/**
 * Tracks processed transcripts to prevent duplicates
 */
export class DuplicateTracker {
  private processedTranscripts: Set<string> = new Set();
  
  /**
   * Check if a transcript has been processed before
   */
  isDuplicate(transcript: string): boolean {
    if (!transcript || transcript.trim() === '') {
      return false;
    }
    
    return this.processedTranscripts.has(transcript);
  }
  
  /**
   * Mark a transcript as processed
   */
  markAsProcessed(transcript: string): void {
    if (transcript && transcript.trim() !== '') {
      this.processedTranscripts.add(transcript);
    }
  }
  
  /**
   * Clean up processed transcripts to prevent memory leaks
   */
  cleanup(maxEntries: number = 25): void {
    if (this.processedTranscripts.size > maxEntries) {
      const toRemove = Array.from(this.processedTranscripts).slice(0, this.processedTranscripts.size - maxEntries);
      toRemove.forEach(transcript => this.processedTranscripts.delete(transcript));
    }
  }
  
  /**
   * Get the count of processed transcripts
   */
  getCount(): number {
    return this.processedTranscripts.size;
  }
}
