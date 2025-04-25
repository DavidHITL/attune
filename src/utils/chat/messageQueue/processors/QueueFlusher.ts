
import { QueuedMessage } from '../types';
import { SaveMessageCallback } from '../../../types';
import { MessageSaveHandler } from '../savers/MessageSaveHandler';

/**
 * Handles flushing of the message queue
 */
export class QueueFlusher {
  constructor(
    private messageQueue: QueuedMessage[],
    private saveMessageCallback: SaveMessageCallback,
    private messageSaver: MessageSaveHandler
  ) {}
  
  /**
   * Process all messages in the queue in order
   */
  async flushQueue(): Promise<void> {
    if (this.messageQueue.length === 0) {
      console.log('Queue flush requested, but queue is empty');
      return;
    }
    
    console.log(`Flushing queue with ${this.messageQueue.length} messages`);
    
    const messagesToProcess = [...this.messageQueue];
    this.messageQueue.length = 0; // Clear the queue
    
    // Process messages in sequence to maintain order
    for (const message of messagesToProcess) {
      try {
        console.log(`Flushing ${message.role} message: ${message.content.substring(0, 30)}...`);
        await this.messageSaver.saveMessageDirectly(message.role, message.content);
      } catch (error) {
        console.error(`Error flushing ${message.role} message:`, error);
      }
    }
    
    console.log('Queue flush complete');
  }
}
