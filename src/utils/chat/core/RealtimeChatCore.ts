
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

export class RealtimeChatCore {
  private connectionManager: ConnectionManager;
  private messageQueue: MessageQueue;
  private responseParser: ResponseParser;
  private eventHandler: EventHandler;
  private userMessageHandler: UserMessageHandler;
  private microphoneManager: MicrophoneManager;
  private transcriptHandler: TranscriptEventHandler;
  private messageEventHandler: MessageEventHandler;
  
  constructor(
    messageCallback: MessageCallback,
    statusCallback: StatusCallback,
    saveMessageCallback: SaveMessageCallback
  ) {
    this.messageQueue = new MessageQueue(saveMessageCallback);
    this.responseParser = new ResponseParser();
    this.userMessageHandler = new UserMessageHandler(saveMessageCallback);
    
    this.transcriptHandler = new TranscriptEventHandler(
      (text) => {
        console.log(`📣 TranscriptEventHandler - Direct save for text: "${text.substring(0, 30)}..."`);
        this.saveUserMessage(text);
      },
      (text) => this.userMessageHandler.accumulateTranscript(text),
      () => this.userMessageHandler.saveTranscriptIfNotEmpty()
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
      saveMessageCallback
    );
    
    this.microphoneManager = new MicrophoneManager(this.connectionManager);
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
    this.microphoneManager.pauseMicrophone();
  }
  
  resumeMicrophone() {
    this.microphoneManager.resumeMicrophone();
  }
  
  forceStopMicrophone() {
    this.microphoneManager.completelyStopMicrophone();
  }
  
  forceResumeMicrophone() {
    this.microphoneManager.forceResumeMicrophone();
  }
  
  isMicrophonePaused() {
    return this.microphoneManager.isMicrophonePaused();
  }
  
  setMuted(muted: boolean) {
    this.connectionManager.setMuted(muted);
  }

  disconnect() {
    this.eventHandler.flushPendingMessages();
    this.connectionManager.disconnect();
  }
}
