
import { Message } from '@/utils/types';

/**
 * Interface for message saving strategies
 */
export interface SaveStrategy {
  saveMessage(
    role: 'user' | 'assistant',
    content: string,
    options?: {
      messageId?: string;
      maxRetries?: number;
      showNotification?: boolean;
    }
  ): Promise<Message | null>;
}
