
/**
 * Monitors and tracks events for debugging and diagnostics
 */
export class EventMonitor {
  private audioEvents: Set<string> = new Set();
  private speechDetected: boolean = false;
  
  /**
   * Track audio-related events
   */
  trackAudioEvent(event: any): void {
    if (event.type?.includes('speech') || event.type?.includes('audio') || event.type?.includes('transcript')) {
      console.log(`SPEECH EVENT [${event.type}]:`, JSON.stringify(event).substring(0, 200));
      this.audioEvents.add(event.type);
      
      // Track if speech was detected for diagnostics
      if (event.type === 'input_audio_buffer.speech_started') {
        this.speechDetected = true;
        console.log("SPEECH DETECTED - expecting transcript soon");
      }
    }
  }
  
  /**
   * Get diagnostic information
   */
  getDiagnostics(): { audioEvents: string[], speechDetected: boolean } {
    return {
      audioEvents: Array.from(this.audioEvents),
      speechDetected: this.speechDetected
    };
  }
}
