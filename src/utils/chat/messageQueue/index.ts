
import { Message, SaveMessageCallback } from '../../types';
import { QueueProcessor } from './QueueProcessor';
import { QueueStatus } from './types';

/**
 * Main MessageQueue class - refactored to delegate to a QueueProcessor
 */
export class MessageQueue {
  private queueProcessor: QueueProcessor;
  
  constructor(saveMessageCallback: SaveMessageCallback) {
    this.queueProcessor = new QueueProcessor(saveMessageCallback);
  }
  
  /**
   * Queue a message for saving
   */
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    this.queueProcessor.queueMessage(role, content, priority);
  }
  
  /**
   * Process any remaining messages synchronously
   */
  async flushQueue(): Promise<void> {
    return this.queueProcessor.flushQueue();
  }
  
  /**
   * Get queue status for debugging
   */
  getQueueStatus(): QueueStatus {
    return this.queueProcessor.getQueueStatus();
  }
}
