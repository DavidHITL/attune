
import { Message, SaveMessageCallback } from '../../types';
import { QueueProcessor } from './QueueProcessor';
import { QueueStatus } from './types';

/**
 * Main MessageQueue class - refactored to delegate to a QueueProcessor with better handling
 * of messages arriving before conversation initialization
 */
export class MessageQueue {
  private queueProcessor: QueueProcessor;
  private pendingPreInitMessages: Array<{role: 'user' | 'assistant', content: string, priority: boolean}> = [];
  private isConversationInitialized: boolean = false;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.queueProcessor = new QueueProcessor(saveMessageCallback);
  }
  
  /**
   * Queue a message for saving, with special handling for pre-initialization messages
   */
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    if (!this.isConversationInitialized && role === 'user') {
      console.log(`Pre-initialization message received, queueing until conversation is ready: ${content.substring(0, 30)}...`);
      this.pendingPreInitMessages.push({ role, content, priority });
      return;
    }
    
    this.queueProcessor.queueMessage(role, content, priority);
  }
  
  /**
   * Signal that conversation is initialized and safe to process messages
   */
  setConversationInitialized(): void {
    if (this.isConversationInitialized) return;
    
    this.isConversationInitialized = true;
    
    // Process any messages that arrived before initialization
    if (this.pendingPreInitMessages.length > 0) {
      console.log(`Processing ${this.pendingPreInitMessages.length} messages that arrived before conversation initialization`);
      
      // Process in order received, with a slight delay between messages
      this.pendingPreInitMessages.forEach((msg, index) => {
        setTimeout(() => {
          console.log(`Processing pre-init message ${index + 1}/${this.pendingPreInitMessages.length}: ${msg.content.substring(0, 30)}...`);
          this.queueProcessor.queueMessage(msg.role, msg.content, msg.priority || true); // Force high priority
        }, index * 200);
      });
      
      // Clear the queue
      this.pendingPreInitMessages = [];
    }
  }
  
  /**
   * Process any remaining messages synchronously
   */
  async flushQueue(): Promise<void> {
    // First process any pre-init messages if we haven't initialized yet
    if (!this.isConversationInitialized && this.pendingPreInitMessages.length > 0) {
      console.log(`Forcing processing of ${this.pendingPreInitMessages.length} pending pre-init messages during flush`);
      this.setConversationInitialized();
    }
    
    return this.queueProcessor.flushQueue();
  }
  
  /**
   * Get queue status for debugging
   */
  getQueueStatus(): QueueStatus & { pendingPreInitMessages: number } {
    return {
      ...this.queueProcessor.getQueueStatus(),
      pendingPreInitMessages: this.pendingPreInitMessages.length
    };
  }

  /**
   * Report any pending messages (for cleanup/debugging)
   */
  reportPendingMessages(): void {
    const status = this.getQueueStatus();
    if (status.pendingPreInitMessages > 0 || status.pendingUserMessages > 0) {
      console.warn(`MessageQueue still has pending messages: ${status.pendingPreInitMessages} pre-init, ${status.pendingUserMessages} regular`);
    }
  }
}

// Export all the types and classes needed externally
export * from './types';
export * from './QueueTypes';
