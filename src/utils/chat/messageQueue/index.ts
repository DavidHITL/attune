
import { Message, SaveMessageCallback } from '../../types';
import { QueueProcessor } from './QueueProcessor';
import { QueueStatus } from './types';

export class MessageQueue {
  private queueProcessor: QueueProcessor;
  private pendingPreInitMessages: Array<{role: 'user' | 'assistant', content: string, priority: boolean}> = [];
  private isConversationInitialized: boolean = false;
  private processingTimeoutId: number | null = null;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.queueProcessor = new QueueProcessor(saveMessageCallback);
    
    // Check if there's already a conversation ID in the global context
    // This helps with race conditions during initialization
    if (typeof window !== 'undefined' && window.conversationContext?.conversationId) {
      console.log("[MessageQueue] Found existing conversation ID during construction:", window.conversationContext.conversationId);
      this.isConversationInitialized = true;
    }
  }
  
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return;
    }

    // Check if the conversation is initialized or if we have a conversation ID in global context
    const isInitialized = this.checkInitialized();
    
    if (!isInitialized) {
      console.log(`[MessageQueue] Pre-initialization message received, queueing until conversation is ready`);
      this.pendingPreInitMessages.push({ role, content, priority });
      return;
    }
    
    this.queueProcessor.queueMessage(role, content, priority);
  }
  
  private checkInitialized(): boolean {
    // Check if already marked as initialized
    if (this.isConversationInitialized) {
      return true;
    }
    
    // Check if there's a conversation ID in window context
    if (typeof window !== 'undefined' && window.conversationContext?.conversationId) {
      console.log("[MessageQueue] Found conversation ID in global context:", window.conversationContext.conversationId);
      this.isConversationInitialized = true;
      return true;
    }
    
    return false;
  }
  
  setConversationInitialized(): void {
    console.log("[MessageQueue] Setting conversation as initialized", {
      wasInitialized: this.isConversationInitialized,
      pendingMessageCount: this.pendingPreInitMessages.length,
      timestamp: new Date().toISOString()
    });
    
    if (this.isConversationInitialized) return;
    
    this.isConversationInitialized = true;
    
    // Ensure we clear any existing processing timeout
    if (this.processingTimeoutId !== null) {
      clearTimeout(this.processingTimeoutId);
    }
    
    // Process any pending messages with progressive delay
    if (this.pendingPreInitMessages.length > 0) {
      console.log(`[MessageQueue] Processing ${this.pendingPreInitMessages.length} pending messages:`, {
        messageTypes: this.pendingPreInitMessages.map(m => m.role).join(', '),
        priorities: this.pendingPreInitMessages.map(m => m.priority).join(', ')
      });
      
      // Process messages with progressive delays to ensure proper order
      const processPendingMessages = () => {
        // Create a copy of the messages to process
        const messagesToProcess = [...this.pendingPreInitMessages];
        this.pendingPreInitMessages = [];
        
        // Process messages with slight delays to maintain order
        messagesToProcess.forEach((msg, index) => {
          setTimeout(() => {
            console.log(`[MessageQueue] Processing pre-init message ${index + 1}/${messagesToProcess.length}:`, {
              role: msg.role,
              priority: msg.priority,
              contentPreview: msg.content.substring(0, 30) + '...'
            });
            this.queueProcessor.queueMessage(msg.role, msg.content, msg.priority);
          }, index * 200);
        });
      };
      
      // Add a small delay before processing to ensure DB is ready
      this.processingTimeoutId = window.setTimeout(processPendingMessages, 500);
    }
  }
  
  // Add public getter method to check initialization status
  isInitialized(): boolean {
    return this.checkInitialized();
  }
  
  async flushQueue(): Promise<void> {
    if (!this.isConversationInitialized && this.pendingPreInitMessages.length > 0) {
      console.log(`Forcing processing of pending pre-init messages during flush`);
      this.setConversationInitialized();
    }
    
    return this.queueProcessor.flushQueue();
  }
  
  getQueueStatus(): QueueStatus & { pendingPreInitMessages: number } {
    const status = {
      ...this.queueProcessor.getQueueStatus(),
      pendingPreInitMessages: this.pendingPreInitMessages.length
    };

    const { pendingUserMessages } = status;
    console.log(`Queue status: ${this.pendingPreInitMessages.length} pre-init, ${pendingUserMessages} regular`);
    
    return status;
  }
}

export * from './types';
export * from './QueueTypes';
