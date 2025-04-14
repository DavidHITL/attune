
import { WebRTCConnection } from '../audio/WebRTCConnection';
import { AudioProcessor } from '../audio/AudioProcessor';
import { MessageCallback, SaveMessageCallback } from '../types';

export class ConnectionManager {
  private webRTCConnection: WebRTCConnection;
  private audioProcessor: AudioProcessor;
  
  constructor(
    private messageHandler: (event: any) => void,
    private audioActivityCallback: (state: 'start' | 'stop') => void,
    private saveMessageCallback?: SaveMessageCallback
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
  
  completelyStopMicrophone(): void {
    this.audioProcessor.completelyStopMicrophone();
  }
  
  forceResumeMicrophone(): void {
    this.audioProcessor.forceResumeMicrophone();
  }
  
  setMuted(muted: boolean): void {
    this.webRTCConnection.setMuted(muted);
  }
  
  saveMessage(role: 'user' | 'assistant', content: string): void {
    if (this.saveMessageCallback && content.trim() !== '') {
      console.log(`[ConnectionManager] Saving ${role} message: ${content.substring(0, 30)}...`);
      this.saveMessageCallback({
        role,
        content
      }).catch(error => {
        console.error(`[ConnectionManager] Error saving ${role} message:`, error);
      });
    }
  }
  
  disconnect(): void {
    // Clean up WebRTC resources
    this.webRTCConnection.disconnect();
    // Clean up audio resources
    this.audioProcessor.cleanup();
  }
}
