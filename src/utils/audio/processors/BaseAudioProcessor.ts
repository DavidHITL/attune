
/**
 * Base class for audio processing that handles common functionality
 */
export class BaseAudioProcessor {
  protected audioStream: MediaStream | null = null;
  protected microphoneActive: boolean = false;
  
  constructor() {
    this.microphoneActive = false;
  }
  
  /**
   * Get a fresh audio stream from the microphone
   */
  async initMicrophone(): Promise<MediaStream> {
    try {
      // Clean up any existing stream first
      this.releaseAllAudioTracks();
      
      // Get a fresh stream
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphoneActive = true;
      console.log("[AudioProcessor] Microphone initialized successfully");
      return this.audioStream;
    } catch (error) {
      console.error("[AudioProcessor] Error accessing microphone:", error);
      this.microphoneActive = false;
      throw error;
    }
  }
  
  /**
   * Release all audio tracks and clean up resources
   */
  releaseAllAudioTracks() {
    // Stop and release all audio tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log("[AudioProcessor] Released audio track:", track.label);
        } catch (e) {
          console.warn("[AudioProcessor] Error stopping audio track:", e);
        }
      });
      this.audioStream = null;
    }
  }
  
  /**
   * Check if microphone is currently active
   */
  isMicrophoneActive(): boolean {
    return this.microphoneActive;
  }
  
  /**
   * Pause microphone by disabling all tracks
   */
  pauseMicrophone() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.enabled = false;
      });
      this.microphoneActive = false;
      console.log("[AudioProcessor] Microphone paused - tracks disabled");
    }
  }
  
  /**
   * Resume microphone by enabling all tracks
   */
  resumeMicrophone() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.enabled = true; 
      });
      this.microphoneActive = true;
      console.log("[AudioProcessor] Microphone resumed - tracks enabled");
    }
  }
}
