
/**
 * Manager for microphone state handling
 */
export class MicrophoneManager {
  private microphonePaused: boolean = false;
  private isMuted: boolean = false;
  
  constructor(
    private connectionManager: any
  ) {}
  
  /**
   * Standard microphone pause
   */
  pauseMicrophone(): void {
    console.log("[MicrophoneManager] Pausing microphone - standard pause");
    this.microphonePaused = true;
    this.connectionManager.pauseMicrophone();
  }
  
  /**
   * Resume microphone if not muted
   */
  resumeMicrophone(): void {
    // Only resume if not muted
    if (!this.isMuted) {
      console.log("[MicrophoneManager] Resuming microphone - standard resume");
      this.microphonePaused = false;
      this.connectionManager.resumeMicrophone();
    } else {
      console.log("[MicrophoneManager] Not resuming microphone because it is muted");
    }
  }
  
  /**
   * Force stop microphone
   */
  forceStopMicrophone(): void {
    console.log("[MicrophoneManager] Force stopping microphone");
    this.microphonePaused = true;
    
    if (this.isMuted) {
      // When muted, completely stop the microphone at device level
      console.log("[MicrophoneManager] Completely stopping microphone (device level)");
      this.connectionManager.completelyStopMicrophone();
    } else {
      // When not muted, just force pause
      this.connectionManager.forcePauseMicrophone();
    }
  }
  
  /**
   * Force resume microphone
   */
  forceResumeMicrophone(): void {
    if (!this.isMuted) {
      console.log("[MicrophoneManager] Force resuming microphone");
      this.microphonePaused = false;
      this.connectionManager.forceResumeMicrophone();
    } else {
      console.log("[MicrophoneManager] Cannot force resume microphone while muted");
    }
  }
  
  /**
   * Set muted state
   */
  setMuted(muted: boolean): void {
    console.log("[MicrophoneManager] Setting muted state to", muted);
    this.isMuted = muted;
    
    // When muting, completely stop microphone to ensure it's completely disabled at device level
    if (muted) {
      console.log("[MicrophoneManager] Mute ON: Completely stopping microphone at device level");
      this.connectionManager.completelyStopMicrophone();
    }
    // When unmuting, the microphone state will be managed by the calling code
  }
  
  /**
   * Check if microphone is paused
   */
  isMicrophonePaused(): boolean {
    return this.microphonePaused || this.isMuted;
  }
  
  /**
   * Get muted state
   */
  getMuted(): boolean {
    return this.isMuted;
  }
}
