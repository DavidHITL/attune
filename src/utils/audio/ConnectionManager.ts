
import { WebRTCConnection } from '../audio/WebRTCConnection';
import { AudioProcessor } from '../audio/AudioProcessor';
import { MessageCallback, SaveMessageCallback } from '../types';
import { VoicePlayer } from './VoicePlayer';

export class ConnectionManager {
  private webRTCConnection: WebRTCConnection;
  public audioProcessor: AudioProcessor;
  private isTestMode: boolean;
  
  constructor(
    private messageHandler: (event: any) => void,
    private audioActivityCallback: (state: 'start' | 'stop') => void,
    private saveMessageCallback?: SaveMessageCallback,
    testMode: boolean = false
  ) {
    this.isTestMode = testMode;
    this.webRTCConnection = new WebRTCConnection(this.isTestMode);
    this.audioProcessor = new AudioProcessor(audioActivityCallback);
  }
  
  async initialize(): Promise<boolean> {
    try {
      // First, initialize microphone to ensure we have audio tracks
      console.log("[ConnectionManager] Setting up audio...");
      const microphone = await this.audioProcessor.initMicrophone();
      
      console.log("[ConnectionManager] Initializing WebRTC connection" + 
        (this.isTestMode ? " in test mode" : ""));
        
      // Pass the message handler to the WebRTC connection
      await this.webRTCConnection.init((event) => {
        // Handle track events for audio playback
        if (event.type === 'track' && event.track && event.track.kind === 'audio') {
          console.log('[ConnectionManager] Received audio track, attaching to player');
          if (event.streams && event.streams.length > 0) {
            VoicePlayer.attachRemoteStream(event.streams[0]);
          }
        }
        
        // Pass all events to the original message handler
        this.messageHandler(event);
      });
      
      // Now that connection is established, add audio track
      this.webRTCConnection.addAudioTrack(microphone);
      
      return true;
    } catch (error) {
      console.error("[ConnectionManager] Connection error:", error);
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
    // Clean up VoicePlayer resources
    VoicePlayer.cleanup();
  }
}
