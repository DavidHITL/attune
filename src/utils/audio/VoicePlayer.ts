
/**
 * Utility for handling remote audio playback
 */
export class VoicePlayer {
  private static audioEl: HTMLAudioElement | null = null;
  private static audioCtx: AudioContext | null = null;
  private static connectedStreamIds = new Set<string>();
  
  /**
   * Attach a remote MediaStream (assistant audio) so it plays out loud.
   */
  static attachRemoteStream(stream: MediaStream) {
    // Skip if we've already connected this stream
    if (this.connectedStreamIds.has(stream.id)) {
      console.log('[VoicePlayer] Stream already attached, skipping:', stream.id);
      return;
    }
    
    console.log('[VoicePlayer] Attaching remote stream:', stream.id);
    console.log('[VoicePlayer] Stream has audio tracks:', stream.getAudioTracks().length);
    this.connectedStreamIds.add(stream.id);
    
    // --- 1. hidden <audio> element ---
    if (!this.audioEl) {
      this.audioEl = document.createElement('audio');
      this.audioEl.autoplay = true;
      this.audioEl.muted = false; // CRITICAL: Make sure audio is not muted
      // Use setAttribute for non-standard properties
      this.audioEl.setAttribute('playsInline', 'true');
      this.audioEl.style.display = 'none';
      document.body.appendChild(this.audioEl);
      console.log('[VoicePlayer] Created new audio element');
    } else {
      console.log('[VoicePlayer] Reusing existing audio element');
    }
    
    this.audioEl.srcObject = stream;
    
    // Log audio element properties for debugging
    console.log('[VoicePlayer] Audio element:', {
      autoplay: this.audioEl.autoplay,
      muted: this.audioEl.muted,
      volume: this.audioEl.volume
    });
    
    this.audioEl.onplay = () => console.info('[VoicePlayer] <audio> playing');
    this.audioEl.onpause = () => console.info('[VoicePlayer] <audio> paused');
    this.audioEl.onerror = (e) => console.error('[VoicePlayer] <audio> error:', e);

    // Try to start playback (may throw if browser blocks autoplay)
    this.audioEl.play()
      .then(() => console.log('[VoicePlayer] Audio playback started successfully'))
      .catch((err) => {
        console.warn('[VoicePlayer] Autoplay blocked; using Web Audio fallback:', err);
        this.setupWebAudioFallback(stream);
      });

    // --- 2. Web Audio fallback (always permitted) ---
    this.setupWebAudioFallback(stream);
    
    console.info('[VoicePlayer] Remote stream attached');
  }
  
  /**
   * Set up Web Audio API as fallback for direct playback
   */
  private static setupWebAudioFallback(stream: MediaStream) {
    try {
      // Create AudioContext on first use (must be triggered by user interaction)
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          console.error('[VoicePlayer] AudioContext not supported in this browser');
          return;
        }
        this.audioCtx = new AudioContext();
        console.log('[VoicePlayer] Created new AudioContext');
      }
      
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume()
          .then(() => console.log('[VoicePlayer] AudioContext resumed'))
          .catch((e) => console.warn('[VoicePlayer] Failed to resume AudioContext:', e));
      }
      
      // Connect stream to audio output
      const src = this.audioCtx.createMediaStreamSource(stream);
      src.connect(this.audioCtx.destination);
      console.info('[VoicePlayer] Connected stream to Web Audio successfully');
    } catch (e) {
      console.error('[VoicePlayer] Error connecting stream to Web Audio:', e);
    }
  }
  
  /**
   * Test audio output to verify sound is working
   */
  static testAudioOutput() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      
      // Create a short beep tone
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.1; // Quiet volume
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200); // Short beep
      
      console.log('[VoicePlayer] Audio test tone played');
      return true;
    } catch (e) {
      console.error('[VoicePlayer] Audio test failed:', e);
      return false;
    }
  }
  
  /**
   * Clean up resources when call ends
   */
  static cleanup() {
    console.log('[VoicePlayer] Cleaning up resources');
    
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl.remove();
      this.audioEl = null;
    }
    
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    
    this.connectedStreamIds.clear();
  }
}
