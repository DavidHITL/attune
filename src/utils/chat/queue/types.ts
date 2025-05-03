
/**
 * Represents a message in the queue
 */
export interface QueuedMessage {
  role: 'user' | 'assistant';
  content: string;
  priority: boolean;
  time: number;
}

/**
 * Queue configuration options
 */
export interface QueueConfig {
  maxQueueSize: number;
  processingInterval: number;
  deduplicationWindow: number;
}
