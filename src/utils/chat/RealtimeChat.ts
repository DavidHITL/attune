
import { MessageCallback, StatusCallback, SaveMessageCallback } from '../types';
import { ConnectionManager } from './ConnectionManager';
import { MessageQueue } from './MessageQueue';
import { ResponseParser } from './ResponseParser';
import { EventHandler } from './EventHandler';

export class RealtimeChat {
  private connectionManager: ConnectionManager;
  private messageQueue: MessageQueue;
  private responseParser: ResponseParser;
  private eventHandler: EventHandler;
  private isMuted: boolean = false;
  private microphonePaused: boolean = false;
  
  constructor(
    private messageCallback: MessageCallback,
    private statusCallback: StatusCallback,
    private saveMessageCallback: SaveMessageCallback
  ) {
    // Initialize components
    this.messageQueue = new MessageQueue(saveMessageCallback);
    this.responseParser = new ResponseParser();
    
    // Create the event handler with the message queue and response parser
    this.eventHandler = new EventHandler(
      this.messageQueue, 
      this.responseParser, 
      messageCallback
    );
    
    // Create connection manager with event handler
    this.connectionManager = new ConnectionManager(
      this.eventHandler.handleMessage,
      (state) => {
        this.messageCallback({
          type: state === 'start' ? 'input_audio_activity_started' : 'input_audio_activity_stopped'
        });
      }
    );
  }

  async init() {
    try {
      this.statusCallback("Connecting...");
      
      // Initialize the connection
      const connected = await this.connectionManager.initialize();
      
      if (connected) {
        this.statusCallback("Connected");
        return true;
      } else {
        throw new Error("Failed to establish connection");
      }
    } catch (error) {
      console.error("Connection error:", error);
      this.statusCallback("Connection failed");
      throw error;
    }
  }
  
  pauseMicrophone() {
    console.log("[RealtimeChat] Pausing microphone - standard pause");
    this.microphonePaused = true;
    this.connectionManager.pauseMicrophone();
  }
  
  resumeMicrophone() {
    // Only resume if not muted
    if (!this.isMuted) {
      console.log("[RealtimeChat] Resuming microphone - standard resume");
      this.microphonePaused = false;
      this.connectionManager.resumeMicrophone();
    } else {
      console.log("[RealtimeChat] Not resuming microphone because audio is muted");
    }
  }

  // Force methods to ensure microphone state
  forceStopMicrophone() {
    console.log("[RealtimeChat] Force stopping microphone");
    this.microphonePaused = true;
    this.connectionManager.forcePauseMicrophone();
  }
  
  forceResumeMicrophone() {
    if (!this.isMuted) {
      console.log("[RealtimeChat] Force resuming microphone");
      this.microphonePaused = false;
      this.connectionManager.forceResumeMicrophone();
    }
  }
  
  isMicrophonePaused() {
    return this.microphonePaused;
  }
  
  setMuted(muted: boolean) {
    console.log("[RealtimeChat] Setting muted state to", muted);
    this.isMuted = muted;
    this.connectionManager.setMuted(muted);
    
    // When muting, always pause microphone
    if (muted) {
      this.forceStopMicrophone();
    }
    // When unmuting, the microphone state will be managed by the calling code
  }
  
  async disconnect() {
    const eventCounts = this.responseParser.getEventCounts();
    console.log("Event type counts:", eventCounts);
    
    // Flush any pending messages in the event handler
    this.eventHandler.flushPendingMessages();
    
    // Process any remaining messages in the queue
    await this.messageQueue.flushQueue();
    
    // Clean up resources
    this.connectionManager.disconnect();
    
    this.statusCallback("Disconnected");
  }
}
