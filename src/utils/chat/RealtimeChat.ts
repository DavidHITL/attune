
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
    this.connectionManager.pauseMicrophone();
  }
  
  resumeMicrophone() {
    this.connectionManager.resumeMicrophone();
  }
  
  setMuted(muted: boolean) {
    this.connectionManager.setMuted(muted);
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
