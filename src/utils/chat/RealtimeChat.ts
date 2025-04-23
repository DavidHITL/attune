import { ConnectionManager } from './ConnectionManager';
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { UserMessageHandler } from './user-messages/UserMessageHandler';
import { TranscriptEventHandler } from './events/TranscriptEventHandler';
import { MessageEventHandler } from './handlers/MessageEventHandler';
import { StatusCallback, MessageCallback, SaveMessageCallback } from '../types';

export class RealtimeChat {
  private connectionManager: ConnectionManager | null = null;
  private messageQueue: MessageQueue | null = null;
  private responseParser: ResponseParser;
  private userMessageHandler: UserMessageHandler;
  private transcriptHandler: TranscriptEventHandler;
  private messageEventHandler: MessageEventHandler;
  private conversationInitialized: boolean = false;
  private retryInitTimerId: number | null = null;
  
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
        
        // Signal to message queue that we're ready for messages once connection is successful
        console.log('Connection successful, scheduling conversation initialization check');
        
        // Schedule a conversation initialization check with retry logic
        this.scheduleConversationInitializationCheck();
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
  
  // Improved conversation initialization check
  private scheduleConversationInitializationCheck() {
    // Clear any existing timer
    if (this.retryInitTimerId !== null) {
      clearTimeout(this.retryInitTimerId);
    }
    
    const checkAndProcess = () => {
      console.log("Checking conversation initialization status");
      
      // First check if global message queue is accessible
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        // Check if the queue is already initialized
        if (window.attuneMessageQueue.isInitialized()) {
          console.log("Message queue already initialized, no action needed");
          this.conversationInitialized = true;
          return;
        }
        
        // Check if conversation ID is available in window context
        if (typeof window !== 'undefined' && window.conversationContext && window.conversationContext.conversationId) {
          console.log("Found conversation ID in global context, marking queue as initialized");
          window.attuneMessageQueue.setConversationInitialized();
          this.conversationInitialized = true;
          return;
        }
        
        // If still not initialized, schedule another check
        console.log("Conversation not yet initialized, scheduling retry");
        this.retryInitTimerId = window.setTimeout(checkAndProcess, 1000);
      } else {
        console.log("Message queue not available, waiting for initialization");
        this.retryInitTimerId = window.setTimeout(checkAndProcess, 1000);
      }
    };
    
    // Start the first check
    checkAndProcess();
  }

  async saveUserMessage(content: string): Promise<void> {
    if (!content || content.trim() === '') {
      console.log("Skipping empty user message");
      return;
    }
    
    console.log(`Attempting to save user message: "${content.substring(0, 30)}..."`);
    
    // Try to use our message queue if possible
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      console.log("Using global message queue for user message");
      window.attuneMessageQueue.queueMessage('user', content, true);
    } else if (this.connectionManager) {
      // Fallback to connection manager
      console.log("Using connection manager for user message");
      this.connectionManager.saveMessage('user', content);
    } else if (this.messageQueue) {
      // Last resort - direct queue
      console.log("Using direct message queue for user message");
      this.messageQueue.queueMessage('user', content, true);
    } else {
      // Final fallback if all else fails - direct DB save
      console.log("Direct saving user message to database");
      this.saveMessageCallback({
        role: 'user',
        content
      }).catch(error => {
        console.error("Failed to save user message:", error);
      });
    }
  }

  saveAssistantMessage(content: string): void {
    if (!content || content.trim() === '') {
      console.log("Skipping empty assistant message");
      return;
    }
    
    console.log(`Queueing assistant message: "${content.substring(0, 30)}..."`);
    
    // Try to use our message queue if possible
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      window.attuneMessageQueue.queueMessage('assistant', content, false);
    } else if (this.connectionManager) {
      // Fallback to connection manager
      this.connectionManager.saveMessage('assistant', content);
    } else if (this.messageQueue) {
      // Last resort - direct queue
      this.messageQueue.queueMessage('assistant', content, false);
    }
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
    
    // First try global queue
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      window.attuneMessageQueue.forceFlushQueue().catch(err => {
        console.error("Error flushing global message queue:", err);
      });
    }
    
    // Then try our direct queue
    if (this.messageQueue) {
      this.messageQueue.flushQueue().catch(err => {
        console.error("Error flushing message queue:", err);
      });
    }
    
    // Also flush any user transcript
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
    
    // Clear any pending initialization timer
    if (this.retryInitTimerId !== null) {
      clearTimeout(this.retryInitTimerId);
      this.retryInitTimerId = null;
    }
    
    // Flush all messages before disconnecting
    this.flushPendingMessages();
    
    // Disconnect the connection manager
    this.connectionManager?.disconnect();
    
    // Cleanup
    this.userMessageHandler.cleanupProcessedMessages();
    this.conversationInitialized = false;
  }
}
