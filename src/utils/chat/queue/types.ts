
/**
 * Public interface for the MessageQueue exposed to the window object
 */
export interface MessageQueuePublicInterface {
  setConversationInitialized: () => void;
  queueMessage: (role: 'user' | 'assistant', content: string, priority?: boolean) => void;
  isInitialized: () => boolean;
  forceFlushQueue: () => Promise<void>;
  flushQueue: () => Promise<void>;
}

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
