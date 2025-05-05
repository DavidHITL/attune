
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
    this.connectedStreamIds.add(stream.id);
    
    // --- 1. hidden <audio> element ---
    if (!this.audioEl) {
      this.audioEl = document.createElement('audio');
      this.audioEl.autoplay = true;
      this.audioEl.playsInline = true;
      this.audioEl.style.display = 'none';
      document.body.appendChild(this.audioEl);
    }
    
    this.audioEl.srcObject = stream;
    this.audioEl.onplay = () => console.info('[VoicePlayer] <audio> playing');

    // Try to start playback (may throw if browser blocks autoplay)
    this.audioEl.play().catch(() => {
      console.warn('[VoicePlayer] Autoplay blocked; using Web Audio fallback');
    });

    // --- 2. Web Audio fallback (always permitted) ---
    if (!this.audioCtx) {
      // Create AudioContext on first use (must be triggered by user interaction)
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error('[VoicePlayer] Failed to create AudioContext:', e);
      }
    }
    
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch((e) => {
          console.warn('[VoicePlayer] Failed to resume AudioContext:', e);
        });
      }
      
      try {
        // Connect once per stream
        const src = this.audioCtx.createMediaStreamSource(stream);
        src.connect(this.audioCtx.destination);
        console.info('[VoicePlayer] Connected stream to Web Audio');
      } catch (e) {
        console.error('[VoicePlayer] Error connecting stream to Web Audio:', e);
      }
    }

    console.info('[VoicePlayer] Remote stream attached');
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
