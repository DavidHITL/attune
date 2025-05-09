
import { MessageQueue } from '../messageQueue';
import { ResponseParser } from '../ResponseParser';
import { EventHandler } from '../EventHandler';
import { UserMessageHandler } from '../user-messages/UserMessageHandler';
import { MicrophoneManager } from '../microphone/MicrophoneManager';
import { TranscriptEventHandler } from '../events/TranscriptEventHandler';
import { MessageCallback, StatusCallback, SaveMessageCallback } from '../../types';
import { MessageEventHandler } from '../handlers/MessageEventHandler';
import { toast } from 'sonner';
import { ConnectionManager } from '../../audio/ConnectionManager';
import { MicrophoneControlManager } from '../microphone/MicrophoneControlManager';

export class RealtimeChatCore {
  private connectionManager: ConnectionManager;
  private messageQueue: MessageQueue;
  private responseParser: ResponseParser;
  private eventHandler: EventHandler;
  private userMessageHandler: UserMessageHandler;
  private microphoneManager: MicrophoneManager;
  private transcriptHandler: TranscriptEventHandler;
  private messageEventHandler: MessageEventHandler;
  private microphoneControlManager: MicrophoneControlManager;
  
  constructor(
    messageCallback: MessageCallback,
    statusCallback: StatusCallback,
    saveMessageCallback: SaveMessageCallback
  ) {
    // Support for anonymous users - create a wrapper that doesn't fail on auth errors
    const safeSaveCallback: SaveMessageCallback = async (message) => {
      try {
        return await saveMessageCallback(message);
      } catch (error) {
        console.log("Message save failed, likely anonymous user:", error);
        // Return a simulated message object so UI flow continues
        return {
          id: `anon-${Date.now()}`,
          role: message.role as 'user' | 'assistant',
          content: message.content || '',
          created_at: new Date().toISOString()
        };
      }
    };

    this.messageQueue = new MessageQueue(safeSaveCallback);
    this.responseParser = new ResponseParser();
    this.userMessageHandler = new UserMessageHandler(safeSaveCallback);
    
    this.transcriptHandler = new TranscriptEventHandler(
      (text) => {
        console.log(`📣 TranscriptEventHandler - Direct save for text: "${text.substring(0, 30)}..."`);
        this.saveUserMessage(text);
      }
    );
    
    this.messageEventHandler = new MessageEventHandler(
      this.messageQueue,
      this.responseParser,
      messageCallback,
      this.userMessageHandler,
      this.transcriptHandler
    );
    
    this.eventHandler = new EventHandler(
      this.messageQueue,
      this.responseParser,
      this.messageEventHandler.handleMessageEvent
    );
    
    this.connectionManager = new ConnectionManager(
      this.eventHandler.handleMessage,
      (state) => {
        messageCallback({
          type: state === 'start' ? 'input_audio_activity_started' : 'input_audio_activity_stopped'
        });
      },
      safeSaveCallback
    );
    
    this.microphoneManager = new MicrophoneManager(this.connectionManager);
    
    // Initialize microphone control manager
    this.microphoneControlManager = new MicrophoneControlManager(this.connectionManager);
  }

  async init() {
    try {
      console.log("Initializing RealtimeChat core...");
      const connected = await this.connectionManager.initialize();
      
      if (connected) {
        console.log("RealtimeChat core initialized successfully");
        return true;
      } else {
        throw new Error("Failed to establish connection");
      }
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  }

  private saveUserMessage(content: string) {
    this.messageEventHandler.saveUserMessage(content);
  }

  // Add flushPendingMessages method
  flushPendingMessages() {
    console.log("Flushing pending messages in RealtimeChatCore");
    this.eventHandler.flushPendingMessages();
  }

  // Forward necessary methods to their respective managers
  pauseMicrophone() {
    this.microphoneControlManager.pauseMicrophone();
  }
  
  resumeMicrophone() {
    this.microphoneControlManager.resumeMicrophone();
  }
  
  forceStopMicrophone() {
    this.microphoneControlManager.forceStopMicrophone();
  }
  
  forceResumeMicrophone() {
    this.microphoneControlManager.forceResumeMicrophone();
  }
  
  isMicrophonePaused() {
    return this.microphoneControlManager.isMicrophonePaused();
  }
  
  setMuted(muted: boolean) {
    this.connectionManager.setMuted(muted);
  }

  disconnect() {
    this.eventHandler.flushPendingMessages();
    this.connectionManager.disconnect();
  }
}
