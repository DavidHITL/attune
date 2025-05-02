
import { SpeechStateTracker } from './SpeechStateTracker';
import { TranscriptAccumulator } from './TranscriptAccumulator';

/**
 * Monitors for stalled transcripts and handles forcing saves when needed
 */
export class TranscriptStalenessMonitor {
  private lastSaveTime: number = 0;
  private forceSaveAfterMs: number = 800; // Force save after 800ms without saves
  private debugId: string;
  
  constructor(
    private accumulator: TranscriptAccumulator,
    private speechTracker: SpeechStateTracker,
    private flushCallback: () => void,
    debugId: string
  ) {
    this.debugId = debugId;
    
    // Set up periodic check for stale transcripts
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkForStalledTranscripts(), 800);
    }
    
    console.log(`[TranscriptStalenessMonitor ${this.debugId}] Initialized`);
  }
  
  /**
   * Update the last save time
   */
  updateLastSaveTime(): void {
    this.lastSaveTime = Date.now();
  }
  
  /**
   * Check for stalled transcripts and force save if needed
   */
  private checkForStalledTranscripts(): void {
    const now = Date.now();
    // If we have accumulated transcript and it's been more than our force save threshold since last save
    if (this.hasAccumulatedTranscript() && 
        (now - this.lastSaveTime > this.forceSaveAfterMs)) {
      console.log(`[TranscriptStalenessMonitor ${this.debugId}] ⚠️ Found stalled transcript (${now - this.lastSaveTime}ms since last save), force saving`);
      this.flushCallback();
    }
    
    // Check if speech has been active for a long time without saving
    if (this.speechTracker.isSpeechDetected() && 
        this.speechTracker.getSpeechDurationMs() > 5000 && 
        (now - this.lastSaveTime > 2000)) {
      console.log(`[TranscriptStalenessMonitor ${this.debugId}] ⚠️ Speech active for ${this.speechTracker.getSpeechDurationMs()}ms without recent save, forcing save`);
      this.flushCallback();
    }
  }
  
  /**
   * Check if there's accumulated transcript
   */
  private hasAccumulatedTranscript(): boolean {
    const text = this.accumulator.getAccumulatedText();
    return !!text && text.trim() !== '';
  }
}
