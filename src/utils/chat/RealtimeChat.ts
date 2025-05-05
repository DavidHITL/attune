
import { ConnectionManager } from '../audio/ConnectionManager';
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { UserMessageHandler } from './user-messages/UserMessageHandler';
import { MessageEventProcessor } from './MessageEventProcessor';
import { ConversationInitializer } from './conversation/ConversationInitializer';
import { MicrophoneControlManager } from './microphone/MicrophoneControlManager';
import { StatusCallback, MessageCallback, SaveMessageCallback } from '../types';

export class RealtimeChat {
  private connectionManager: ConnectionManager | null = null;
  private messageQueue: MessageQueue | null = null;
  private responseParser: ResponseParser;
  private userMessageHandler: UserMessageHandler;
  private messageEventProcessor: MessageEventProcessor;
  private conversationInitializer: ConversationInitializer;
  private microphoneManager: MicrophoneControlManager;
  private testMode: boolean;
  
  constructor(
    private messageCallback: MessageCallback,
    private statusCallback: StatusCallback,
    private saveMessageCallback: SaveMessageCallback,
    testMode: boolean = false
  ) {
    this.testMode = testMode;
    this.responseParser = new ResponseParser();
    this.messageQueue = new MessageQueue(this.saveMessageCallback);
    this.userMessageHandler = new UserMessageHandler(this.saveMessageCallback);
    
    // Create the central message event processor
    this.messageEventProcessor = new MessageEventProcessor(
      this.messageQueue,
      this.responseParser,
      this.messageCallback
    );
    
    this.conversationInitializer = new ConversationInitializer(this.statusCallback, this.messageQueue);
    this.microphoneManager = new MicrophoneControlManager(null); // Initialize with null, will be set later
  }

  async init(): Promise<boolean> {
    try {
      // Create ConnectionManager and pass the required callbacks
      this.connectionManager = new ConnectionManager(
        // Use the message event processor for all events
        (event) => this.messageEventProcessor.processEvent(event),
        (state: 'start' | 'stop') => {
          this.statusCallback(`Audio ${state}`);
        },
        this.saveMessageCallback
      );
      
      // Enable test mode if requested
      if (this.testMode) {
        console.log('[RealtimeChat] Running in test mode');
      }
      
      const initSuccess = await this.connectionManager.initialize();
      
      if (initSuccess) {
        this.statusCallback('Connected');
        // Pass the initialized connectionManager to the microphoneManager
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
    
    // Log that we're explicitly saving a user message
    console.log(`[RealtimeChat] saveUserMessage called with content length ${content.length}, first 50 chars: "${content.substring(0, 50)}..."`);
    
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      // Explicitly set role to 'user' since this method is for user messages
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
    this.messageEventProcessor.flushPendingMessages();
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
