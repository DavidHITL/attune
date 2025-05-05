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
