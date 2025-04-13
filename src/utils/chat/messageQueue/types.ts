
import { Message } from '../../types';

export type QueuedMessage = { 
  role: 'user' | 'assistant', 
  content: string, 
  priority: boolean 
};

export type QueueStatus = { 
  queueLength: number, 
  pendingUserMessages: number, 
  activeSaves: number 
};
