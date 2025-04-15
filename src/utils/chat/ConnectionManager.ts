
import { WebRTCConnection } from '../audio/WebRTCConnection';
import { AudioProcessor } from '../audio/AudioProcessor';
import { MessageCallback, SaveMessageCallback } from '../types';
import { MessageQueue } from './messageQueue';

export class ConnectionManager {
  private webRTCConnection: WebRTCConnection;
  public audioProcessor: AudioProcessor;
  private messageQueue: MessageQueue | null = null;
  
  constructor(
    private messageHandler: (event: any) => void,
    private audioActivityCallback: (state: 'start' | 'stop') => void,
    private saveMessageCallback?: SaveMessageCallback
  ) {
    this.webRTCConnection = new WebRTCConnection();
    this.audioProcessor = new AudioProcessor(audioActivityCallback);
    
    // Initialize message queue if we have a save callback
    if (saveMessageCallback) {
      this.messageQueue = new MessageQueue(saveMessageCallback);
      
      // Register the message queue globally for conversation initialization
      if (typeof window !== 'undefined') {
        window.attuneMessageQueue = {
          setConversationInitialized: () => {
            this.messageQueue?.setConversationInitialized();
          },
          queueMessage: (role: 'user' | 'assistant', content: string, priority: boolean = false) => {
            this.messageQueue?.queueMessage(role, content, priority);
          }
        };
      }
    }
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
    if (!content || content.trim() === '') {
      console.log(`[ConnectionManager] Skipping empty ${role} message`);
      return;
    }
    
    if (this.messageQueue) {
      console.log(`[ConnectionManager] Queueing ${role} message: ${content.substring(0, 30)}...`);
      // Use the message queue for better handling of initialization race conditions
      this.messageQueue.queueMessage(role, content, role === 'user');
    } else if (this.saveMessageCallback) {
      console.log(`[ConnectionManager] Direct saving ${role} message: ${content.substring(0, 30)}...`);
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
    
    // Clean up global reference
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      delete window.attuneMessageQueue;
    }
  }
}
