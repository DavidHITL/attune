import { SaveMessageCallback } from '../../types';
import { MessageSaver } from './MessageSaver';
import { QueuedMessage } from './types';
import { QueueMonitor } from './QueueMonitor';
import { QueueProcessingLogic } from './processors/QueueProcessingLogic';
import { QueueFlusher } from './processors/QueueFlusher';
import { MessageValidator } from './processors/MessageValidator';

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
   * Add a message to the queue with unified processing logic
   */
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    // Validate the message
    if (!this.messageValidator.isValidMessage(role, content)) {
      return;
    }
    
    console.log(`Queued ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}", priority: ${priority}`);
    
    // For high priority messages, attempt immediate save
    if (priority) {
      console.log(`Processing ${role} message with HIGH PRIORITY`);
      const messageId = `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      this.saveMessageDirectly(role, content, messageId);
    } else {
      // Add to queue for standard processing
      this.messageQueue.push({ role, content, priority });
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
    if (this.queueMonitor.isProcessing() || this.messageQueue.length === 0) {
      console.log("Queue processing skipped - already processing or empty queue");
      return;
    }
    
    this.queueMonitor.setProcessingState(true);
    console.log(`Processing message queue with ${this.messageQueue.length} messages`);
    
    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (!message) continue;
        
        this.queueMonitor.trackProcessedMessage(message);
        
        try {
          console.log(`Processing ${message.role} message from queue:`, message.content.substring(0, 50));
          const result = await this.processingLogic.processMessageDirectly(
            message.role, 
            message.content,
            message.role === 'user' ? `queue-${Date.now()}` : undefined
          );
            
          if (!result.success) {
            console.log(`Re-queuing ${message.role} message after save failure`);
            this.messageQueue.unshift(message);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log(`Successfully processed ${message.role} message from queue`);
          }
        } catch (error) {
          console.error(`Failed to save ${message.role} message from queue:`, error);
          this.messageQueue.unshift(message);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error("Error in message queue processing:", error);
    } finally {
      this.queueMonitor.setProcessingState(false);
      
      // Check for any new messages that might have been added
      if (this.messageQueue.length > 0) {
        console.log(`Found ${this.messageQueue.length} new messages, continuing processing`);
        setTimeout(() => this.processMessageQueue(), 100);
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
