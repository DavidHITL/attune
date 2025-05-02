
/**
 * Tracks the state of user speech detection
 */
export class SpeechStateTracker {
  private userSpeechDetected: boolean = false;
  private speechStartTime: number = 0;
  
  /**
   * Mark speech as started
   */
  markSpeechStarted(): void {
    if (!this.userSpeechDetected) {
      this.speechStartTime = Date.now();
    }
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
   * Get the duration of the current speech in milliseconds
   */
  getSpeechDurationMs(): number {
    if (!this.userSpeechDetected) {
      return 0;
    }
    return Date.now() - this.speechStartTime;
  }

  /**
   * Reset speech detection state
   */
  reset(): void {
    this.userSpeechDetected = false;
    this.speechStartTime = 0;
  }
}
