
import { ConnectionManager } from './ConnectionManager';
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
  private processedMessageHashes: Set<string> = new Set();
  private isFlushingMessages: boolean = false;
  
  constructor(
    private messageCallback: MessageCallback,
    private statusCallback: StatusCallback,
    private saveMessageCallback: SaveMessageCallback
  ) {
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
    this.microphoneManager = new MicrophoneControlManager(this.connectionManager);
    
    // Make message queue available globally
    if (typeof window !== 'undefined') {
      window.attuneMessageQueue = this.messageQueue;
    }
  }

  async init(): Promise<boolean> {
    try {
      this.connectionManager = new ConnectionManager(
        // Use the message event processor for all events
        (event) => this.messageEventProcessor.processEvent(event),
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
    
    // Generate a hash for the content
    const contentHash = `${content.substring(0, 30)}-${content.length}`;
    
    // Skip if we've already processed this message
    if (this.processedMessageHashes.has(contentHash)) {
      console.log(`[RealtimeChat] Skipping duplicate user message`);
      return Promise.resolve();
    }
    
    // Add to processed set
    this.processedMessageHashes.add(contentHash);
    
    // Limit processed set size
    if (this.processedMessageHashes.size > 100) {
      this.processedMessageHashes = new Set(
        Array.from(this.processedMessageHashes).slice(-50)
      );
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

  /**
   * Flushes any pending messages in a coordinated way to prevent duplicate saves
   * This is a critical path for cleanup, so we need to prevent redundant flush operations
   */
  flushPendingMessages(): void {
    // Prevent recursive or duplicate flush operations
    if (this.isFlushingMessages) {
      console.log("[RealtimeChat] Already flushing messages, skipping redundant flush request");
      return;
    }

    this.isFlushingMessages = true;
    console.log("[RealtimeChat] Starting coordinated message flush operation");
    
    try {
      // First, check if there are any pending messages in the message processor
      // This ensures that any buffered assistant messages are processed first
      this.messageEventProcessor.flushPendingMessages();
      
      // After the event processor has flushed its pending responses,
      // flush the message queue to handle any queued messages
      if (this.messageQueue) {
        console.log("[RealtimeChat] Flushing message queue");
        this.messageQueue.flushQueue().catch(err => {
          console.error("[RealtimeChat] Error flushing message queue:", err);
        });
      }
      
      // Finally, save any remaining transcript from the user message handler
      // This is typically for incomplete user utterances that weren't sent yet
      this.userMessageHandler.saveTranscriptIfNotEmpty();
      
    } finally {
      // Always reset the flushing flag when complete
      this.isFlushingMessages = false;
      console.log("[RealtimeChat] Completed coordinated message flush operation");
    }
  }

  disconnect(): void {
    console.log("[RealtimeChat] Disconnecting from chat...");
    this.statusCallback('Disconnected');
    
    this.conversationInitializer.cleanup();
    
    // Only flush messages if we haven't already done so
    if (!this.isFlushingMessages) {
      this.flushPendingMessages();
    }
    
    this.connectionManager?.disconnect();
    this.userMessageHandler.cleanupProcessedMessages();
  }
}

export * from './messageQueue/types';
export * from './messageQueue/QueueTypes';
