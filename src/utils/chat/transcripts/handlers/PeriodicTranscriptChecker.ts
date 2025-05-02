
import { TranscriptAccumulator } from './TranscriptAccumulator';

/**
 * Handles periodic checks and saves of transcript content
 */
export class PeriodicTranscriptChecker {
  private lastCheckTime: number = 0;
  private saveIntervalMs: number = 300; // More aggressive saving (300ms)
  private debugId: string;
  
  constructor(
    private accumulator: TranscriptAccumulator,
    private saveCallback: (text: string) => void,
    debugId: string
  ) {
    this.debugId = debugId;
    console.log(`[PeriodicTranscriptChecker ${this.debugId}] Initialized`);
  }
  
  /**
   * Check if it's time to save accumulated transcript
   */
  checkAndSaveIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastCheckTime > this.saveIntervalMs && this.hasAccumulatedTranscript()) {
      console.log(`[PeriodicTranscriptChecker ${this.debugId}] 🕒 Time threshold reached, saving accumulated transcript`);
      const accumulatedText = this.accumulator.getAccumulatedText();
      this.saveCallback(accumulatedText);
      this.lastCheckTime = now;
    }
  }
  
  /**
   * Get the last check time
   */
  getLastCheckTime(): number {
    return this.lastCheckTime;
  }
  
  /**
   * Update the last check time
   */
  updateLastCheckTime(): void {
    this.lastCheckTime = Date.now();
  }
  
  /**
   * Check if there's accumulated transcript
   */
  private hasAccumulatedTranscript(): boolean {
    const text = this.accumulator.getAccumulatedText();
    return !!text && text.trim() !== '';
  }
}
