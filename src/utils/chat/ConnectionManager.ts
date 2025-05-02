
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
    
    // Only initialize message queue if we have a save callback
    if (saveMessageCallback) {
      this.messageQueue = new MessageQueue(saveMessageCallback);
    }
  }
  
  async initialize(): Promise<boolean> {
    try {
      console.log("Setting up audio...");
      const microphone = await this.audioProcessor.initMicrophone();
      
      console.log("Initializing WebRTC connection...");
      await this.webRTCConnection.init(this.messageHandler);
      
      this.webRTCConnection.addAudioTrack(microphone);
      
      // Make message queue available globally for conversation initialization
      if (this.messageQueue && typeof window !== 'undefined') {
        console.log("Registering global message queue");
        window.attuneMessageQueue = {
          setConversationInitialized: () => {
            console.log("[ConnectionManager] Marking conversation as initialized");
            this.messageQueue?.setConversationInitialized();
          },
          queueMessage: (role: 'user' | 'assistant', content: string, priority: boolean = false) => {
            // CRITICAL: Validate role parameter is provided
            if (!role) {
              console.error('[ConnectionManager] No role provided to queueMessage - rejecting message');
              return;
            }
            
            console.log(`[ConnectionManager] Queueing ${role} message (priority: ${priority}):`, {
              contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
              timestamp: new Date().toISOString()
            });
            this.messageQueue?.queueMessage(role, content, priority);
          },
          isInitialized: () => {
            return this.messageQueue ? this.messageQueue.isInitialized() : false;
          },
          forceFlushQueue: () => {
            console.log("[ConnectionManager] Force flushing message queue");
            return this.messageQueue ? this.messageQueue.forceFlushQueue() : Promise.resolve();
          },
          flushQueue: () => {
            console.log("[ConnectionManager] Flushing message queue");
            return this.messageQueue ? this.messageQueue.flushQueue() : Promise.resolve();
          }
        };
      }
      
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
    
    // Validate role is either 'user' or 'assistant'
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[ConnectionManager] Invalid role "${role}" provided to saveMessage - must be 'user' or 'assistant'`);
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
    // First flush any pending messages before disconnection
    if (this.messageQueue) {
      console.log("[ConnectionManager] Flushing message queue before disconnection");
      this.messageQueue.flushQueue().catch(err => {
        console.error("[ConnectionManager] Error flushing message queue:", err);
      });
    }
    
    // Clean up WebRTC resources
    this.webRTCConnection.disconnect();
    // Clean up audio resources
    this.audioProcessor.cleanup();
    
    // Clean up global reference
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      console.log("[ConnectionManager] Removing global message queue reference");
      delete window.attuneMessageQueue;
    }
  }
}
