
/**
 * Handles audio processing and microphone state
 */
export class AudioProcessor {
  private microphoneStream: MediaStream | null = null;
  private isPaused: boolean = false;
  
  constructor(private audioActivityCallback: (state: 'start' | 'stop') => void) {}
  
  /**
   * Initialize the microphone and audio processing
   */
  async initMicrophone(): Promise<MediaStream> {
    try {
      // Request access to the microphone
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      console.log("Microphone access granted:", this.microphoneStream.getAudioTracks()[0]?.label);
      
      // Reset the paused state when we get a new stream
      this.isPaused = false;
      
      return this.microphoneStream;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }
  
  /**
   * Standard microphone pause
   */
  pauseMicrophone(): void {
    if (this.microphoneStream) {
      console.log("Pausing microphone");
      this.microphoneStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      this.isPaused = true;
      this.audioActivityCallback('stop');
    }
  }
  
  /**
   * Resume microphone
   */
  resumeMicrophone(): void {
    if (this.microphoneStream) {
      console.log("Resuming microphone");
      this.microphoneStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      this.isPaused = false;
      this.audioActivityCallback('start');
    }
  }
  
  /**
   * Force pause microphone
   */
  forcePauseMicrophone(): void {
    console.log("Force pausing microphone");
    this.pauseMicrophone();
  }
  
  /**
   * Completely stop microphone
   */
  completelyStopMicrophone(): void {
    console.log("Completely stopping microphone");
    if (this.microphoneStream) {
      this.microphoneStream.getAudioTracks().forEach(track => {
        track.stop();
      });
      this.microphoneStream = null;
      this.isPaused = true;
      this.audioActivityCallback('stop');
    }
  }
  
  /**
   * Force resume microphone
   */
  async forceResumeMicrophone(): Promise<void> {
    console.log("Force resuming microphone");
    
    if (!this.microphoneStream) {
      // Re-initialize the microphone if it was completely stopped
      try {
        await this.initMicrophone();
        this.resumeMicrophone();
      } catch (error) {
        console.error("Error re-initializing microphone:", error);
      }
    } else {
      this.resumeMicrophone();
    }
  }
  
  /**
   * Check if the microphone is currently paused
   */
  isMicrophonePaused(): boolean {
    return this.isPaused;
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.microphoneStream) {
      console.log("Cleaning up audio processor");
      this.microphoneStream.getAudioTracks().forEach(track => {
        track.stop();
      });
      this.microphoneStream = null;
    }
  }
}
