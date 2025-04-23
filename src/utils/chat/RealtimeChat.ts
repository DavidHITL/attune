
import { ConnectionManager } from './ConnectionManager';
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { UserMessageHandler } from './user-messages/UserMessageHandler';
import { TranscriptEventHandler } from './events/TranscriptEventHandler';
import { MessageEventHandler } from './handlers/MessageEventHandler';
import { ConversationInitializer } from './conversation/ConversationInitializer';
import { MicrophoneControlManager } from './microphone/MicrophoneControlManager';
import { StatusCallback, MessageCallback, SaveMessageCallback } from '../types';

export class RealtimeChat {
  private connectionManager: ConnectionManager | null = null;
  private messageQueue: MessageQueue | null = null;
  private responseParser: ResponseParser;
  private userMessageHandler: UserMessageHandler;
  private transcriptHandler: TranscriptEventHandler;
  private messageEventHandler: MessageEventHandler;
  private conversationInitializer: ConversationInitializer;
  private microphoneManager: MicrophoneControlManager;
  
  constructor(
    private messageCallback: MessageCallback,
    private statusCallback: StatusCallback,
    private saveMessageCallback: SaveMessageCallback
  ) {
    this.responseParser = new ResponseParser();
    this.messageQueue = new MessageQueue(this.saveMessageCallback);
    this.userMessageHandler = new UserMessageHandler(this.saveMessageCallback);
    
    // Fix: Create a transcript handler with a function that properly forwards to messageQueue
    this.transcriptHandler = new TranscriptEventHandler(
      (text: string) => {
        if (this.messageQueue) {
          this.messageQueue.queueMessage('user', text, true);
        }
      }
    );
    
    this.messageEventHandler = new MessageEventHandler(
      this.messageQueue,
      this.responseParser,
      this.messageCallback,
      this.userMessageHandler,
      this.transcriptHandler
    );
    
    this.conversationInitializer = new ConversationInitializer(this.statusCallback, this.messageQueue);
    this.microphoneManager = new MicrophoneControlManager(this.connectionManager);
  }

  async init(): Promise<boolean> {
    try {
      this.connectionManager = new ConnectionManager(
        (event) => this.messageEventHandler.handleMessageEvent(event),
        (state: 'start' | 'stop') => {
          this.statusCallback(`Audio ${state}`);
        },
        this.saveMessageCallback
      );
      
      const initSuccess = await this.connectionManager.initialize();
      
      if (initSuccess) {
        this.statusCallback('Connected');
        this.microphoneManager = new MicrophoneControlManager(this.connectionManager);
        this.conversationInitializer.scheduleConversationInitializationCheck();
      } else {
        this.statusCallback('Connection Failed');
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize connection:", error);
      this.statusCallback(`Initialization Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  // Microphone control methods delegate to MicrophoneControlManager
  pauseMicrophone(): void {
    this.microphoneManager.pauseMicrophone();
  }

  resumeMicrophone(): void {
    this.microphoneManager.resumeMicrophone();
  }

  forceStopMicrophone(): void {
    this.microphoneManager.forceStopMicrophone();
  }

  forceResumeMicrophone(): void {
    this.microphoneManager.forceResumeMicrophone();
  }

  setMuted(muted: boolean): void {
    this.microphoneManager.setMuted(muted);
  }

  isMicrophonePaused(): boolean {
    return this.microphoneManager.isMicrophonePaused();
  }

  saveUserMessage(content: string): Promise<void> {
    if (!content || content.trim() === '') {
      console.log("Skipping empty user message");
      return Promise.resolve();
    }
    
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      window.attuneMessageQueue.queueMessage('user', content, true);
      return Promise.resolve();
    }
    
    return this.userMessageHandler.saveUserMessage(content);
  }

  flushPendingMessages(): void {
    console.log("Forcing flush of all pending messages");
    this.messageQueue?.flushQueue().catch(err => {
      console.error("Error flushing message queue:", err);
    });
    this.userMessageHandler.saveTranscriptIfNotEmpty();
  }

  disconnect(): void {
    console.log("Disconnecting from chat...");
    this.statusCallback('Disconnected');
    
    this.conversationInitializer.cleanup();
    this.flushPendingMessages();
    this.connectionManager?.disconnect();
    this.userMessageHandler.cleanupProcessedMessages();
  }
}

export * from './messageQueue/types';
export * from './messageQueue/QueueTypes';
