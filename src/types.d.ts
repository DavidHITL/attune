
// Add to existing file or create if it doesn't exist
import { MessageQueuePublicInterface } from './utils/chat/queue/types';

declare global {
  interface Window {
    __attuneConversationId?: string;
    attuneMessageQueue?: MessageQueuePublicInterface;
    conversationContext?: {
      conversationId: string;
      userId: string | null;
      isInitialized: boolean;
      messageCount: number;
    };
  }
}

export {};
