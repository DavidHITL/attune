import { ConnectionManager } from './ConnectionManager';
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { UserMessageHandler } from './user-messages/UserMessageHandler';
import { TranscriptEventHandler } from './events/TranscriptEventHandler';
import { MessageEventHandler } from './handlers/MessageEventHandler';
import { StatusCallback, MessageCallback, SaveMessageCallback } from '../types';

/**
 * Main class for handling realtime chat with voice capabilities
 */
export class RealtimeChat {
  private connectionManager: ConnectionManager | null = null;
  private messageQueue: MessageQueue | null = null;
  private responseParser: ResponseParser;
  private userMessageHandler: UserMessageHandler;
  private transcriptHandler: TranscriptEventHandler;
  private messageEventHandler: MessageEventHandler;
  
  constructor(
    private messageCallback: MessageCallback,
    private statusCallback: StatusCallback,
    private saveMessageCallback: SaveMessageCallback
  ) {
    this.responseParser = new ResponseParser();
    this.messageQueue = new MessageQueue(this.saveMessageCallback);
    this.userMessageHandler = new UserMessageHandler(this.saveMessageCallback);
    this.transcriptHandler = new TranscriptEventHandler(
      (text) => this.saveUserMessage(text)
    );
    this.messageEventHandler = new MessageEventHandler(
      this.messageQueue,
      this.responseParser,
      this.messageCallback,
      this.userMessageHandler,
      this.transcriptHandler
    );
  }

  /**
   * Wait for the message queue to be ready with a conversation ID
   */
  private async waitForMessageQueue(timeout = 3000): Promise<boolean> {
    console.log("Waiting for message queue to be ready...");
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (this.messageQueue?.isConversationInitialized()) {
        console.log("Message queue is ready with conversation ID");
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn("Timeout waiting for message queue initialization");
    return false;
  }

  async init(): Promise<boolean> {
    try {
      // Initialize the connection manager
      this.connectionManager = new ConnectionManager(
        this.messageEventHandler.handleMessageEvent,
        (state: 'start' | 'stop') => {
          this.statusCallback(`Audio ${state}`);
        },
        this.saveMessageCallback
      );
      
      // Initialize the connection
      const initSuccess = await this.connectionManager.initialize();
      
      if (initSuccess) {
        this.statusCallback('Connected');
      } else {
        this.statusCallback('Connection Failed');
        return false;
      }

      // Signal to message queue that we're ready for messages once connection is successful
      if (this.connectionManager && this.messageQueue) {
        setTimeout(() => {
          console.log('Conversation initialization complete, processing any pending messages');
          this.messageQueue?.setConversationInitialized();
        }, 500); // Small delay to ensure connection is stable
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize connection:", error);
      this.statusCallback(`Initialization Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async saveUserMessage(content: string): Promise<void> {
    if (!content || content.trim() === '') {
      console.log("Skipping empty user message");
      return;
    }
    
    console.log(`Attempting to save user message: "${content.substring(0, 30)}..."`);
    
    try {
      // Wait for message queue to be ready with conversation ID
      const isReady = await this.waitForMessageQueue();
      
      if (!isReady) {
        console.error("Failed to save message: Message queue not ready");
        throw new Error("Message queue not initialized");
      }
      
      console.log(`Queueing user message with conversation: "${content.substring(0, 30)}..."`);
      this.messageQueue?.queueMessage('user', content, true);
    } catch (error) {
      console.error("Error saving user message:", error);
      throw error;
    }
  }

  saveAssistantMessage(content: string): void {
    if (!content || content.trim() === '') {
      console.log("Skipping empty assistant message");
      return;
    }
    
    console.log(`Queueing assistant message: "${content.substring(0, 30)}..."`);
    this.messageQueue?.queueMessage('assistant', content, false);
  }

  /**
   * Accumulate transcript
   */
  accumulateTranscript(text: string): void {
    this.userMessageHandler.accumulateTranscript(text);
  }

  /**
   * Flush pending messages
   */
  flushPendingMessages(): void {
    console.log("Forcing flush of all pending messages");
    this.messageQueue?.flushQueue();
    this.userMessageHandler.saveTranscriptIfNotEmpty();
  }

  /**
   * Check if microphone is paused
   */
  isMicrophonePaused(): boolean {
    return this.connectionManager?.audioProcessor.isMicrophonePaused() || false;
  }

  /**
   * Pause microphone
   */
  pauseMicrophone(): void {
    this.connectionManager?.pauseMicrophone();
  }

  /**
   * Resume microphone
   */
  resumeMicrophone(): void {
    this.connectionManager?.resumeMicrophone();
  }

  /**
   * Force stop microphone
   */
  forceStopMicrophone(): void {
    this.connectionManager?.completelyStopMicrophone();
  }

  /**
   * Force resume microphone
   */
  forceResumeMicrophone(): void {
    this.connectionManager?.forceResumeMicrophone();
  }

  /**
   * Set muted state
   */
  setMuted(muted: boolean): void {
    this.connectionManager?.setMuted(muted);
  }
  
  disconnect(): void {
    console.log("Disconnecting from chat...");
    this.statusCallback('Disconnected');
    this.connectionManager?.disconnect();
    this.userMessageHandler.cleanupProcessedMessages();
    this.messageQueue?.flushQueue();
  }
}
