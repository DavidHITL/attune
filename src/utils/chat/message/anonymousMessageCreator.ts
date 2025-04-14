
import { Message } from '@/utils/types';

export const createAnonymousMessage = (role: 'user' | 'assistant', content: string): Message => {
  return {
    id: `anon-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9)}`,
    role,
    content,
    created_at: new Date().toISOString()
  };
};
