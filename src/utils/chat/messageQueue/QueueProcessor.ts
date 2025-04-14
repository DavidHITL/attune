
import { SaveMessageCallback } from '../../types';
import { MessageSaver } from './MessageSaver';
import { QueuedMessage } from './types';
import { QueueMonitor } from './QueueMonitor';
import { QueueProcessingLogic } from './processors/QueueProcessingLogic';
import { QueueFlusher } from './processors/QueueFlusher';
import { MessageValidator } from './processors/MessageValidator';

/**
 * Handles processing message queue with reliability and error handling
 */
export class QueueProcessor {
  private messageQueue: QueuedMessage[] = [];
  private messageSaver: MessageSaver;
  private queueMonitor: QueueMonitor;
  private processingLogic: QueueProcessingLogic;
  private queueFlusher: QueueFlusher;
  private messageValidator: MessageValidator;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.messageSaver = new MessageSaver(saveMessageCallback);
    this.queueMonitor = new QueueMonitor(
      () => this.messageQueue.length,
      () => this.messageSaver.getPendingUserMessages(),
      () => this.messageSaver.getActiveMessageSaves()
    );
    this.processingLogic = new QueueProcessingLogic(this.messageSaver, this.messageQueue);
    this.queueFlusher = new QueueFlusher(this.messageQueue, saveMessageCallback, this.messageSaver);
    this.messageValidator = new MessageValidator(this.messageSaver);
  }
  
  /**
   * Add a message to the queue
   */
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    // Validate the message
    if (!this.messageValidator.isValidMessage(role, content)) {
      return;
    }
    
    // Check for duplicate content
    if (this.messageValidator.isDuplicate(role, content, this.messageQueue)) {
      return;
    }
    
    console.log(`Queued ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}", priority: ${priority}`);
    
    // For user messages or priority messages, try to save immediately
    if (role === 'user' || priority) {
      console.log(`Processing ${role} message with HIGH PRIORITY`);
      
      // Create a message ID to track this message
      const messageId = `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (role === 'user') {
        this.messageSaver.trackPendingUserMessage(messageId);
      }
      
      // Save message immediately with direct error handling
      this.saveMessageDirectly(role, content, messageId);
    } else {
      // For assistant messages, add to queue for processing
      this.messageQueue.push({ role, content, priority: false });
      console.log(`Queue length: ${this.messageQueue.length}`);
      this.processMessageQueue();
    }
  }
  
  /**
   * Save message directly with better error handling
   */
  private async saveMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string): Promise<void> {
    const message = { role, content, priority: true };
    
    try {
      const result = await this.processingLogic.processMessageDirectly(role, content, messageId);
      
      if (!result.success) {
        // Add to queue for retry through normal queue processing if direct save fails
        console.log(`Adding ${role} message to retry queue after direct save failures`);
        this.messageQueue.push(message);
        this.processMessageQueue();
      }
    } catch (error) {
      // Add to queue for retry
      console.log(`Error in direct save, adding to queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.messageQueue.push(message);
      this.processMessageQueue();
    }
  }
  
  /**
   * Process message queue to ensure sequential saving
   */
  async processMessageQueue(): Promise<void> {
    if (this.queueMonitor.isProcessing() || this.messageQueue.length === 0) return;
    
    this.queueMonitor.setProcessingState(true);
    
    try {
      const message = this.messageQueue.shift();
      if (message) {
        this.queueMonitor.trackProcessedMessage(message);
        
        try {
          const result = await this.processingLogic.processMessageDirectly(
            message.role, 
            message.content,
            message.role === 'user' ? `queue-${Date.now()}` : undefined
          );
            
          if (!result.success) {
            // Put back in queue for retry (at the beginning)
            console.log(`Re-queuing ${message.role} message after save failure`);
            this.messageQueue.unshift(message);
            
            // Wait a bit before retrying
            setTimeout(() => this.processMessageQueue(), 2000);
          }
        } catch (error) {
          console.error(`Failed to save ${message.role} message from queue:`, error);
          
          // Put back in queue for retry (at the beginning)
          this.messageQueue.unshift(message);
          
          // Wait a bit before retrying
          setTimeout(() => this.processMessageQueue(), 2000);
        }
      }
    } catch (error) {
      console.error("Error in message queue processing:", error);
    } finally {
      this.queueMonitor.setProcessingState(false);
      
      // Process next message if any
      if (this.messageQueue.length > 0) {
        setTimeout(() => this.processMessageQueue(), 100); // Small delay between processing items
      }
    }
  }
  
  /**
   * Process any remaining messages
   */
  async flushQueue(): Promise<void> {
    await this.queueFlusher.flushQueue();
  }
  
  /**
   * Get queue status for debugging
   */
  getQueueStatus(): { queueLength: number, pendingUserMessages: number, activeSaves: number } {
    return {
      queueLength: this.messageQueue.length,
      pendingUserMessages: this.messageSaver.getPendingUserMessages(),
      activeSaves: this.messageSaver.getActiveMessageSaves()
    };
  }
}
