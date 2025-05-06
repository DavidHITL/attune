
import { WebRTCConnection } from './WebRTCConnection';
import { MessageCallback, SaveMessageCallback } from '../types';
import { RecorderManager } from './processors/RecorderManager';

export class ConnectionManager {
  private webRTCConnection: WebRTCConnection | null = null;
  private microphoneProcessor: RecorderManager | null = null;
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
      
      // Initialize recorder manager
      this.microphoneProcessor = new RecorderManager(this.audioActivityCallback);
      
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
    return this.microphoneProcessor?.getRecordingState() === 'inactive' || false;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    // Implement actual muting logic here if needed
  }

  pauseMicrophone(): void {
    if (this.microphoneProcessor) {
      this.microphoneProcessor.stopRecording();
    }
  }

  resumeMicrophone(): void {
    if (this.microphoneProcessor && !this.isMuted) {
      // Only resume if not muted
      this.microphoneProcessor.startRecording();
    }
  }

  forceStopMicrophone(): void {
    if (this.microphoneProcessor) {
      this.microphoneProcessor.stopRecording();
    }
  }

  // Add this method to match what MicrophoneControlManager is calling
  completelyStopMicrophone(): void {
    if (this.microphoneProcessor) {
      this.microphoneProcessor.stopRecording();
      this.microphoneProcessor.cleanup();
    }
  }

  forceResumeMicrophone(): void {
    if (this.microphoneProcessor && !this.isMuted) {
      this.microphoneProcessor.startRecording();
    }
  }

  disconnect(): void {
    console.log('[ConnectionManager] Disconnecting');
    
    // Stop the microphone processor
    if (this.microphoneProcessor) {
      this.microphoneProcessor.cleanup();
      this.microphoneProcessor = null;
    }
    
    // Disconnect the WebRTC connection
    if (this.webRTCConnection) {
      this.webRTCConnection.disconnect();
      this.webRTCConnection = null;
    }
  }
}
