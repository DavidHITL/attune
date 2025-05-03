
import { MessageQueue } from '../queue/MessageQueue';
import { SaveMessageCallback } from '../../types';

// Singleton instance of the MessageQueue
let messageQueueInstance: MessageQueue | null = null;

/**
 * Initialize the global message queue with a save message callback
 */
export const initializeMessageQueue = (saveMessageCallback: SaveMessageCallback): MessageQueue => {
  if (!messageQueueInstance) {
    console.log('[QueueProvider] Creating global message queue instance');
    messageQueueInstance = new MessageQueue(saveMessageCallback);
    
    // Make it globally accessible if needed
    if (typeof window !== 'undefined') {
      window.attuneMessageQueue = messageQueueInstance;
    }
  }
  
  return messageQueueInstance;
};

/**
 * Get the global message queue instance
 * Will return null if not initialized
 */
export const getMessageQueue = (): MessageQueue | null => {
  if (!messageQueueInstance) {
    console.warn('[QueueProvider] Attempted to access message queue before initialization');
  }
  return messageQueueInstance;
};

/**
 * Reset the message queue (for testing or cleanup)
 */
export const resetMessageQueue = (): void => {
  messageQueueInstance = null;
  if (typeof window !== 'undefined') {
    window.attuneMessageQueue = null;
  }
};
