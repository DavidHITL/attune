
import { WebRTCConnection } from '../audio/WebRTCConnection';
import { AudioProcessor } from '../audio/AudioProcessor';
import { MessageCallback } from '../types';

export class ConnectionManager {
  private webRTCConnection: WebRTCConnection;
  private audioProcessor: AudioProcessor;
  
  constructor(
    private messageHandler: (event: any) => void,
    audioActivityCallback: (state: 'start' | 'stop') => void
  ) {
    this.webRTCConnection = new WebRTCConnection();
    this.audioProcessor = new AudioProcessor(audioActivityCallback);
  }
  
  async initialize(): Promise<boolean> {
    try {
      // First, initialize microphone to ensure we have audio tracks
      console.log("Setting up audio...");
      const microphone = await this.audioProcessor.initMicrophone();
      
      console.log("Initializing WebRTC connection...");
      // Pass the message handler to the WebRTC connection
      await this.webRTCConnection.init(this.messageHandler);
      
      // Now that connection is established, add audio track
      this.webRTCConnection.addAudioTrack(microphone);
      
      return true;
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  }
  
  pauseMicrophone(): void {
    this.audioProcessor.pauseMicrophone();
  }
  
  resumeMicrophone(): void {
    this.audioProcessor.resumeMicrophone();
  }
  
  // Force methods to ensure microphone state is set correctly
  forcePauseMicrophone(): void {
    this.audioProcessor.forcePauseMicrophone();
  }
  
  forceResumeMicrophone(): void {
    this.audioProcessor.forceResumeMicrophone();
  }
  
  setMuted(muted: boolean): void {
    this.webRTCConnection.setMuted(muted);
  }
  
  disconnect(): void {
    // Clean up WebRTC resources
    this.webRTCConnection.disconnect();
    // Clean up audio resources
    this.audioProcessor.cleanup();
  }
}
