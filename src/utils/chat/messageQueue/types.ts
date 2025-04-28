
import { Message } from '../../types';

export type QueuedMessage = { 
  role: 'user' | 'assistant', 
  content: string, 
  priority: boolean 
};
