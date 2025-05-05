
import { WebRTCConnection } from '../audio/WebRTCConnection';
import { AudioProcessor } from '../audio/AudioProcessor';
import { MessageCallback, SaveMessageCallback } from '../types';
import { MessageQueue } from './messageQueue';
import { MessageQueuePublicInterface } from './queue/types';

export class ConnectionManager {
  private webRTCConnection: WebRTCConnection;
  public audioProcessor: AudioProcessor;
  private messageQueue: MessageQueue | null = null;
  private debugId: string;
  
  constructor(
    private messageHandler: (event: any) => void,
    private audioActivityCallback: (state: 'start' | 'stop') => void,
    private saveMessageCallback?: SaveMessageCallback
  ) {
    this.debugId = `CM-${Date.now().toString(36)}`;
    this.webRTCConnection = new WebRTCConnection();
    this.audioProcessor = new AudioProcessor(audioActivityCallback);
    
    // Only initialize message queue if we have a save callback
    if (saveMessageCallback) {
      this.messageQueue = new MessageQueue(saveMessageCallback);
      console.log(`[ConnectionManager ${this.debugId}] Message queue initialized with save callback`);
    } else {
      console.log(`[ConnectionManager ${this.debugId}] No save callback provided, message queue not initialized`);
    }
  }
  
  async initialize(): Promise<boolean> {
    try {
      console.log(`[ConnectionManager ${this.debugId}] Setting up audio...`);
      const microphone = await this.audioProcessor.initMicrophone();
      
      console.log(`[ConnectionManager ${this.debugId}] Initializing WebRTC connection...`);
      await this.webRTCConnection.init(this.messageHandler);
      
      this.webRTCConnection.addAudioTrack(microphone);
      
      // Make message queue available globally for conversation initialization
      if (this.messageQueue && typeof window !== 'undefined') {
        console.log(`[ConnectionManager ${this.debugId}] Registering global message queue`);
        
        // Create public interface to expose only the necessary methods
        const publicInterface: MessageQueuePublicInterface = {
          setConversationInitialized: () => {
            console.log(`[ConnectionManager ${this.debugId}] Marking conversation as initialized`);
            this.messageQueue?.setConversationInitialized();
          },
          queueMessage: (role: 'user' | 'assistant', content: string, priority: boolean = false) => {
            // CRITICAL: Validate role parameter is provided
            if (!role) {
              console.error(`[ConnectionManager ${this.debugId}] No role provided to queueMessage - rejecting message`);
              return;
            }
            
            console.log(`[ConnectionManager ${this.debugId}] Queueing ${role} message (priority: ${priority}):`, {
              contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
              contentLength: content.length,
              timestamp: new Date().toISOString(),
              role
            });
            this.messageQueue?.queueMessage(role, content, priority);
          },
          isInitialized: () => {
            const isInitialized = this.messageQueue ? this.messageQueue.isInitialized() : false;
            console.log(`[ConnectionManager ${this.debugId}] Queue initialization check: ${isInitialized}`);
            return isInitialized;
          },
          forceFlushQueue: () => {
            console.log(`[ConnectionManager ${this.debugId}] Force flushing message queue`);
            return this.messageQueue ? this.messageQueue.forceFlushQueue() : Promise.resolve();
          },
          flushQueue: () => {
            console.log(`[ConnectionManager ${this.debugId}] Flushing message queue`);
            return this.messageQueue ? this.messageQueue.flushQueue() : Promise.resolve();
          }
        };
        
        window.attuneMessageQueue = publicInterface;
      }
      
      return true;
    } catch (error) {
      console.error(`[ConnectionManager ${this.debugId}] Connection error:`, error);
      throw error;
    }
  }

  pauseMicrophone(): void {
    console.log(`[ConnectionManager ${this.debugId}] Pausing microphone`);
    this.audioProcessor.pauseMicrophone();
  }
  
  resumeMicrophone(): void {
    console.log(`[ConnectionManager ${this.debugId}] Resuming microphone`);
    this.audioProcessor.resumeMicrophone();
  }
  
  // Force methods to ensure microphone state is set correctly
  forcePauseMicrophone(): void {
    console.log(`[ConnectionManager ${this.debugId}] Force pausing microphone`);
    this.audioProcessor.forcePauseMicrophone();
  }
  
  completelyStopMicrophone(): void {
    console.log(`[ConnectionManager ${this.debugId}] Completely stopping microphone`);
    this.audioProcessor.completelyStopMicrophone();
  }
  
  forceResumeMicrophone(): void {
    console.log(`[ConnectionManager ${this.debugId}] Force resuming microphone`);
    this.audioProcessor.forceResumeMicrophone();
  }
  
  setMuted(muted: boolean): void {
    console.log(`[ConnectionManager ${this.debugId}] Setting muted state: ${muted}`);
    this.webRTCConnection.setMuted(muted);
  }
  
  saveMessage(role: 'user' | 'assistant', content: string): void {
    if (!content || content.trim() === '') {
      console.log(`[ConnectionManager ${this.debugId}] Skipping empty ${role} message`);
      return;
    }
    
    // Validate role is either 'user' or 'assistant'
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[ConnectionManager ${this.debugId}] Invalid role "${role}" provided to saveMessage - must be 'user' or 'assistant'`);
      return;
    }
    
    if (this.messageQueue) {
      console.log(`[ConnectionManager ${this.debugId}] Queueing ${role} message: ${content.substring(0, 30)}...`, {
        contentLength: content.length,
        timestamp: new Date().toISOString()
      });
      // Use the message queue for better handling of initialization race conditions
      this.messageQueue.queueMessage(role, content, role === 'user');
    } else if (this.saveMessageCallback) {
      console.log(`[ConnectionManager ${this.debugId}] Direct saving ${role} message: ${content.substring(0, 30)}...`, {
        contentLength: content.length,
        timestamp: new Date().toISOString()
      });
      this.saveMessageCallback({
        role,
        content
      }).catch(error => {
        console.error(`[ConnectionManager ${this.debugId}] Error saving ${role} message:`, error);
      });
    }
  }
  
  disconnect(): void {
    const startTime = Date.now();
    console.log(`[ConnectionManager ${this.debugId}] Disconnecting...`, {
      timestamp: new Date(startTime).toISOString()
    });
    
    // First flush any pending messages before disconnection
    if (this.messageQueue) {
      console.log(`[ConnectionManager ${this.debugId}] Flushing message queue before disconnection`);
      this.messageQueue.flushQueue().catch(err => {
        console.error(`[ConnectionManager ${this.debugId}] Error flushing message queue:`, err);
      });
    }
    
    // Clean up WebRTC resources
    console.log(`[ConnectionManager ${this.debugId}] Disconnecting WebRTC connection`);
    this.webRTCConnection.disconnect();
    
    // Clean up audio resources
    console.log(`[ConnectionManager ${this.debugId}] Cleaning up audio processor`);
    this.audioProcessor.cleanup();
    
    // Clean up global reference
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      console.log(`[ConnectionManager ${this.debugId}] Removing global message queue reference`);
      delete window.attuneMessageQueue;
    }
    
    const endTime = Date.now();
    console.log(`[ConnectionManager ${this.debugId}] Disconnection complete`, {
      durationMs: endTime - startTime,
      timestamp: new Date(endTime).toISOString()
    });
  }
}
