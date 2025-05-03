
/**
 * Tracks the state of user speech detection
 */
export class SpeechStateTracker {
  private userSpeechDetected: boolean = false;
  
  /**
   * Mark speech as started
   */
  markSpeechStarted(): void {
    this.userSpeechDetected = true;
  }
  
  /**
   * Mark speech as stopped
   */
  markSpeechStopped(): void {
    this.userSpeechDetected = false;
  }
  
  /**
   * Check if speech is currently detected
   */
  isSpeechDetected(): boolean {
    return this.userSpeechDetected;
  }

  /**
   * Reset speech detection state
   */
  reset(): void {
    this.userSpeechDetected = false;
  }
}
