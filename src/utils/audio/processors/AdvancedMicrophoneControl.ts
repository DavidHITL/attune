/**
 * Provides enhanced microphone control capabilities beyond basic enable/disable
 */
export class AdvancedMicrophoneControl {
  private audioStream: MediaStream | null = null;
  
  /**
   * Set the audio stream to control
   */
  setAudioStream(stream: MediaStream) {
    this.audioStream = stream;
  }
  
  /**
   * Force pause microphone with additional muting
   */
  forcePauseMicrophone() {
    if (this.audioStream) {
      // More aggressive approach - both disable and mute tracks
      this.audioStream.getTracks().forEach(track => {
        track.enabled = false;
        if (track.kind === 'audio' && 'muted' in track) {
          try {
            // @ts-ignore - Some browsers support this
            track.muted = true;
          } catch (e) {
            // Ignore if not supported
          }
        }
      });
      console.log("[AdvancedMicrophoneControl] Microphone FORCE paused - tracks disabled and muted");
    } else {
      console.log("[AdvancedMicrophoneControl] No audio stream to force pause");
    }
  }
  
  /**
   * Force resume microphone, reinitializing if necessary
   */
  async forceResumeMicrophone() {
    // Try to re-initialize the microphone if needed
    if (!this.audioStream || this.audioStream.getTracks().length === 0) {
      console.log("[AdvancedMicrophoneControl] No active audio stream, attempting to reinitialize");
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("[AdvancedMicrophoneControl] Microphone reinitialized successfully");
        return this.audioStream;
      } catch (err) {
        console.error("[AdvancedMicrophoneControl] Failed to reinitialize microphone:", err);
        return null;
      }
    }
    
    // Otherwise enable all tracks in the current stream
    this.audioStream.getTracks().forEach(track => {
      track.enabled = true;
      if (track.kind === 'audio' && 'muted' in track) {
        try {
          // @ts-ignore - Some browsers support this
          track.muted = false;
        } catch (e) {
          // Ignore if not supported
        }
      }
    });
    console.log("[AdvancedMicrophoneControl] Microphone FORCE resumed - all tracks enabled");
    return this.audioStream;
  }
}
