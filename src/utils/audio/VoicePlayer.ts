
/**
 * Singleton utility to manage audio output from the voice assistant
 */
export class VoicePlayer {
  private static remoteAudioEl: HTMLAudioElement | null = null;
  private static audioContext: AudioContext | null = null;
  
  /**
   * Attaches a remote media stream to an audio element for playback
   */
  public static attachRemoteStream(stream: MediaStream): void {
    console.info('[VoicePlayer] Attaching remote audio stream');
    
    // Create audio element if it doesn't exist
    if (!this.remoteAudioEl) {
      console.info('[VoicePlayer] Creating new audio element');
      this.remoteAudioEl = document.createElement('audio');
      this.remoteAudioEl.autoplay = true;
      this.remoteAudioEl.playsInline = true; 
      this.remoteAudioEl.style.display = 'none';
      document.body.appendChild(this.remoteAudioEl);
    }
    
    // Set the stream as the source
    this.remoteAudioEl.srcObject = stream;
    
    // Make sure audio plays (for browsers that require user interaction)
    this.remoteAudioEl.play().catch(err => {
      console.warn('[VoicePlayer] Auto-play failed, may need user interaction:', err);
      
      // Create audio context as backup approach
      if (!this.audioContext) {
        console.info('[VoicePlayer] Creating audio context');
        this.audioContext = new AudioContext();
      }
      
      // Try Web Audio API approach as fallback
      if (this.audioContext && this.audioContext.state === 'suspended') {
        console.info('[VoicePlayer] Attempting to resume audio context');
        this.audioContext.resume().catch(err => {
          console.error('[VoicePlayer] Failed to resume audio context:', err);
        });
      }
      
      // Create source from stream and connect to output
      if (this.audioContext) {
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.audioContext.destination);
        console.info('[VoicePlayer] Connected stream to audio context destination');
      }
    });
  }
  
  /**
   * Disconnects and removes the audio element
   */
  public static cleanup(): void {
    console.info('[VoicePlayer] Cleaning up audio resources');
    
    if (this.remoteAudioEl) {
      this.remoteAudioEl.pause();
      this.remoteAudioEl.srcObject = null;
      
      if (this.remoteAudioEl.parentNode) {
        this.remoteAudioEl.parentNode.removeChild(this.remoteAudioEl);
      }
      
      this.remoteAudioEl = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close().catch(err => {
        console.error('[VoicePlayer] Error closing audio context:', err);
      });
      this.audioContext = null;
    }
  }
}
