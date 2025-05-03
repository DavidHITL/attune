
import { QueuedMessage } from './types';

/**
 * Core queue data structure and operations
 */
export class MessageQueueCore {
  private queue: QueuedMessage[] = [];
  private processing: boolean = false;
  
  /**
   * Add a message to the queue
   */
  enqueue(message: QueuedMessage): void {
    this.queue.push(message);
  }
  
  /**
   * Get the next message from the queue (without removing it)
   */
  peek(): QueuedMessage | undefined {
    if (this.queue.length === 0) return undefined;
    return this.queue[0];
  }
  
  /**
   * Remove and return the next message from the queue
   */
  dequeue(): QueuedMessage | undefined {
    return this.queue.shift();
  }
  
  /**
   * Get all messages in the queue
   */
  getAll(): QueuedMessage[] {
    return [...this.queue];
  }
  
  /**
   * Clear all messages from the queue
   */
  clear(): void {
    this.queue = [];
  }
  
  /**
   * Sort the queue by priority and time
   */
  sortByPriority(): void {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority ? -1 : 1;
      }
      return a.time - b.time;
    });
  }
  
  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
  
  /**
   * Get the number of messages in the queue
   */
  size(): number {
    return this.queue.length;
  }
  
  /**
   * Check if the queue is currently being processed
   */
  isProcessing(): boolean {
    return this.processing;
  }
  
  /**
   * Set the processing state
   */
  setProcessing(processing: boolean): void {
    this.processing = processing;
  }
}
