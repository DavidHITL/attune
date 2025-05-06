
import { WebRTCConnection } from '../audio/WebRTCConnection';
import { AudioProcessor } from '../audio/AudioProcessor';
import { MessageCallback, SaveMessageCallback } from '../types';
import { VoicePlayer } from './VoicePlayer';
import { toast } from 'sonner';

export class ConnectionManager {
  private webRTCConnection: WebRTCConnection;
  public audioProcessor: AudioProcessor;
  private isTestMode: boolean;
  private connectionCheckInterval: number | null = null;
  
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
        
      // Enhanced message handler that isolates track events
      const enhancedHandler = (event: any) => {
        // Special handling for track events - route them to audio player
        if (event.type === 'track' && event.track && event.track.kind === 'audio') {
          console.log('[ConnectionManager] Received audio track, attaching to player');
          if (event.streams && event.streams.length > 0) {
            // Play a notification sound to inform the user
            toast.success("Audio connection established");
            
            // Attach the audio track to the player
            VoicePlayer.attachRemoteStream(event.streams[0]);
          } else {
            console.error('[ConnectionManager] Audio track received but no stream available');
          }
        }
        
        // Pass all events to the original message handler
        this.messageHandler(event);
      };
      
      // Pass the enhanced message handler to the WebRTC connection
      await this.webRTCConnection.init(enhancedHandler);
      
      // Start connection monitoring
      this.startConnectionMonitoring();
      
      // Try to play a test tone to verify audio system is working
      VoicePlayer.testAudioOutput();
      
      // Now that connection is established, add audio track
      this.webRTCConnection.addAudioTrack(microphone);
      
      return true;
    } catch (error) {
      console.error("[ConnectionManager] Connection error:", error);
      throw error;
    }
  }
  
  // Start monitoring WebRTC connection status
  private startConnectionMonitoring() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    this.connectionCheckInterval = window.setInterval(() => {
      const state = this.webRTCConnection.getConnectionState();
      const audioStatus = this.webRTCConnection.getAudioStatus();
      
      console.log('[ConnectionManager] Connection state:', state);
      console.log('[ConnectionManager] Audio status:', audioStatus);
      
      // If we have remote tracks but audio isn't playing, try to fix it
      if (audioStatus.remoteTracks > 0 && !audioStatus.streamActive) {
        console.log('[ConnectionManager] Remote tracks exist but stream inactive, trying to fix');
        // Try to wake up audio system
        VoicePlayer.testAudioOutput();
      }
    }, 10000) as unknown as number;
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
    // Stop connection monitoring
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    // Clean up WebRTC resources
    this.webRTCConnection.disconnect();
    // Clean up audio resources
    this.audioProcessor.cleanup();
    // Clean up VoicePlayer resources
    VoicePlayer.cleanup();
  }
}
