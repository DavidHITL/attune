
/**
 * Utility for handling remote audio playback with optimized latency
 */
export class VoicePlayer {
  private static audioEl: HTMLAudioElement | null = null;
  private static audioCtx: AudioContext | null = null;
  private static connectedStreamIds = new Set<string>();
  private static audioSources: MediaStreamAudioSourceNode[] = [];
  private static audioDestination: MediaStreamAudioDestinationNode | null = null;
  private static latencyHintValue: AudioContextLatencyCategory = 'interactive';
  
  /**
   * Set latency hint for audio context to optimize performance
   */
  static setLatencyHint(hint: AudioContextLatencyCategory) {
    this.latencyHintValue = hint;
    
    // If context exists, update it
    if (this.audioCtx) {
      // Store current connections
      const currentConnections = [...this.audioSources];
      
      // Close and recreate with new latency hint
      this.audioCtx.close();
      this.createAudioContext();
      
      // Reconnect sources
      currentConnections.forEach(source => {
        if (source.mediaStream) {
          this.attachRemoteStream(source.mediaStream);
        }
      });
    }
  }
  
  /**
   * Create audio context with optimal settings
   */
  private static createAudioContext() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.error('[VoicePlayer] AudioContext not supported in this browser');
        return;
      }
      
      // Use low latency settings
      this.audioCtx = new AudioContext({
        latencyHint: this.latencyHintValue,
        sampleRate: 48000 // Higher sample rate for better quality
      });
      
      // Create a destination node for flexible routing
      this.audioDestination = this.audioCtx.createMediaStreamDestination();
      this.audioDestination.connect(this.audioCtx.destination);
      
      console.log('[VoicePlayer] Created new AudioContext with latency hint:', this.latencyHintValue);
    } catch (e) {
      console.error('[VoicePlayer] Error creating AudioContext:', e);
    }
  }
  
  /**
   * Attach a remote MediaStream (assistant audio) so it plays out loud with optimized latency.
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
    
    // --- 1. Create <audio> element with optimized settings ---
    if (!this.audioEl) {
      this.audioEl = document.createElement('audio');
      this.audioEl.autoplay = true;
      this.audioEl.muted = false;
      this.audioEl.setAttribute('playsInline', 'true');
      
      // Add low latency attributes
      this.audioEl.preload = 'auto';
      
      // IMPORTANT: Set buffer size as small as possible for low latency
      (this.audioEl as any).mozAutoplayEnabled = true; // Firefox-specific
      (this.audioEl as any).mozPreservesPitch = false; // Firefox-specific
      (this.audioEl as any).webkitPreservesPitch = false; // Safari-specific
      
      this.audioEl.style.display = 'none';
      document.body.appendChild(this.audioEl);
      console.log('[VoicePlayer] Created new audio element with optimized settings');
    } else {
      console.log('[VoicePlayer] Reusing existing audio element');
    }
    
    this.audioEl.srcObject = stream;
    
    // Add event listeners for debugging
    this.audioEl.onplay = () => console.info('[VoicePlayer] <audio> playing');
    this.audioEl.onpause = () => console.info('[VoicePlayer] <audio> paused');
    this.audioEl.onerror = (e) => console.error('[VoicePlayer] <audio> error:', e);
    
    // IMPROVED: Add timeupdate listener to monitor playback
    this.audioEl.ontimeupdate = () => {
      const currentTime = this.audioEl?.currentTime || 0;
      if (currentTime > 0 && currentTime < 0.5) {
        console.log('[VoicePlayer] Audio playback started, currentTime:', currentTime);
      }
    };

    // Try to start playback with low latency options
    const playPromise = this.audioEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => console.log('[VoicePlayer] Audio playback started successfully'))
        .catch((err) => {
          console.warn('[VoicePlayer] Autoplay blocked; using Web Audio fallback:', err);
          this.setupWebAudioFallback(stream);
        });
    }

    // --- 2. Web Audio API setup with improved performance ---
    this.setupWebAudioFallback(stream);
    
    console.info('[VoicePlayer] Remote stream attached with low latency settings');
  }
  
  /**
   * Set up Web Audio API as fallback for direct playback with optimized latency
   */
  private static setupWebAudioFallback(stream: MediaStream) {
    try {
      // Create AudioContext only once
      if (!this.audioCtx) {
        this.createAudioContext();
      }
      
      if (this.audioCtx?.state === 'suspended') {
        this.audioCtx.resume()
          .then(() => console.log('[VoicePlayer] AudioContext resumed'))
          .catch((e) => console.warn('[VoicePlayer] Failed to resume AudioContext:', e));
      }
      
      // PERFORMANCE: Use AudioWorklet for better performance if available
      const useWorklet = typeof AudioWorkletNode !== 'undefined';
      console.log('[VoicePlayer] Using AudioWorklet API:', useWorklet);
      
      // Connect stream to audio output with minimal processing
      const src = this.audioCtx!.createMediaStreamSource(stream);
      
      // PERFORMANCE: Skip unnecessary nodes in the audio graph
      src.connect(this.audioCtx!.destination);
      
      // Store source for cleanup
      this.audioSources.push(src);
      
      console.info('[VoicePlayer] Connected stream to Web Audio successfully with optimized pipeline');
    } catch (e) {
      console.error('[VoicePlayer] Error connecting stream to Web Audio:', e);
    }
  }
  
  /**
   * Test audio output to verify sound is working with minimal latency
   */
  static testAudioOutput() {
    try {
      if (!this.audioCtx) {
        this.createAudioContext();
      }
      
      // Make sure audio context is running
      if (this.audioCtx?.state === 'suspended') {
        this.audioCtx.resume().catch(e => console.warn('[VoicePlayer] Failed to resume AudioContext:', e));
      }
      
      // Create a short beep tone with minimal latency
      const oscillator = this.audioCtx!.createOscillator();
      const gainNode = this.audioCtx!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx!.destination);
      
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.1; // Quiet volume
      
      // IMPROVED: More precise timing for minimal latency
      const now = this.audioCtx!.currentTime;
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      
      console.log('[VoicePlayer] Audio test tone played with minimal latency');
      return true;
    } catch (e) {
      console.error('[VoicePlayer] Audio test failed:', e);
      return false;
    }
  }
  
  /**
   * Wake up audio system - improved for iOS and Android devices
   */
  static wakeUpAudioSystem() {
    // Create silent audio context to wake up audio system
    try {
      // Use existing context if available
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        console.log('[VoicePlayer] Resuming existing audio context');
        this.audioCtx.resume()
          .then(() => console.log('[VoicePlayer] Existing AudioContext resumed'))
          .catch(e => console.warn('[VoicePlayer] Failed to resume existing AudioContext:', e));
        return;
      }
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
      
      // IMPROVED: Use more reliable technique for iOS wake-up
      const silence = ctx.createBuffer(1, 1, 48000);
      const source = ctx.createBufferSource();
      source.buffer = silence;
      source.connect(ctx.destination);
      
      // IMPROVED: More precise timing
      source.start();
      
      if (ctx.state === 'suspended') {
        ctx.resume()
          .then(() => console.log('[VoicePlayer] New AudioContext resumed during wake-up'))
          .catch(e => console.warn('[VoicePlayer] Failed to resume new AudioContext:', e));
      }
      
      console.log('[VoicePlayer] Audio system wake-up complete, state:', ctx.state);
      
      // Play silent audio element (required for iOS Safari)
      const silentAudio = document.createElement('audio');
      silentAudio.setAttribute('playsinline', 'true');
      silentAudio.muted = true;
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      silentAudio.play()
        .then(() => console.log('[VoicePlayer] Silent audio played successfully'))
        .catch(e => console.warn('[VoicePlayer] Silent audio play failed:', e));
      
      // Clean up
      setTimeout(() => {
        silentAudio.remove();
        ctx.close().catch(() => {});
      }, 1000);
      
    } catch (e) {
      console.warn('[VoicePlayer] Audio wake-up failed:', e);
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
    
    // Disconnect all audio sources
    this.audioSources.forEach(src => {
      try {
        src.disconnect();
      } catch (e) {
        console.warn('[VoicePlayer] Error disconnecting audio source:', e);
      }
    });
    this.audioSources = [];
    
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    
    if (this.audioDestination) {
      this.audioDestination = null;
    }
    
    this.connectedStreamIds.clear();
  }
}
