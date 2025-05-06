
import { WebRTCConnection } from './WebRTCConnection';
import { MessageCallback, SaveMessageCallback } from '../types';
import { MicrophoneProcessor } from './processors/RecorderManager';

export class ConnectionManager {
  private webRTCConnection: WebRTCConnection | null = null;
  private microphoneProcessor: MicrophoneProcessor | null = null;
  private isMuted: boolean = false;

  constructor(
    private messageCallback: MessageCallback,
    private audioActivityCallback: (state: 'start' | 'stop') => void,
    private saveMessageCallback?: SaveMessageCallback,
    private testMode: boolean = false
  ) {
    this.webRTCConnection = null;
    this.microphoneProcessor = null;
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('[ConnectionManager] Initializing connection');
      
      // Create WebRTC connection
      this.webRTCConnection = new WebRTCConnection(this.testMode);
      
      // Initialize WebRTC connection with message handler
      await this.webRTCConnection.init(this.messageCallback);
      
      // Initialize microphone processor
      // This is where we would set up the microphone connection
      // but for now, we're assuming it's handled separately
      
      return true;
    } catch (error) {
      console.error('[ConnectionManager] Error initializing:', error);
      this.disconnect();
      throw error;
    }
  }

  // Add a method to get the WebRTCConnection
  getWebRTCConnection(): WebRTCConnection {
    if (!this.webRTCConnection) {
      throw new Error('WebRTCConnection not initialized');
    }
    return this.webRTCConnection;
  }

  isMicrophonePaused(): boolean {
    return this.microphoneProcessor?.isPaused() || false;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    // Implement actual muting logic here if needed
  }

  pauseMicrophone(): void {
    if (this.microphoneProcessor) {
      this.microphoneProcessor.pause();
    }
  }

  resumeMicrophone(): void {
    if (this.microphoneProcessor) {
      this.microphoneProcessor.resume();
    }
  }

  forceStopMicrophone(): void {
    if (this.microphoneProcessor) {
      this.microphoneProcessor.stop();
    }
  }

  forceResumeMicrophone(): void {
    if (this.microphoneProcessor) {
      this.microphoneProcessor.start();
    }
  }

  disconnect(): void {
    console.log('[ConnectionManager] Disconnecting');
    
    // Stop the microphone processor
    if (this.microphoneProcessor) {
      this.microphoneProcessor.stop();
      this.microphoneProcessor = null;
    }
    
    // Disconnect the WebRTC connection
    if (this.webRTCConnection) {
      this.webRTCConnection.disconnect();
      this.webRTCConnection = null;
    }
  }
}
