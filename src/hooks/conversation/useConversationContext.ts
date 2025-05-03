
import { useEffect, useRef } from 'react';
import { Message } from '@/utils/types';

export const useConversationContext = (
  conversationId: string | null,
  userId: string | null,
  messages: Message[]
) => {
  const messageQueueInitializedRef = useRef(false);

  // Track conversation state globally
  useEffect(() => {
    // Create or update the global conversation context
    if (typeof window !== 'undefined') {
      window.conversationContext = {
        conversationId,
        userId: userId || null,
        isInitialized: !!conversationId,
        messageCount: messages.length
      };
      
      console.log(`[useConversationContext] Updated global context:`, {
        conversationId,
        userId: userId || null,
        hasMessages: messages.length > 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Signal to any message queues that the conversation is initialized when ID is set
    if (conversationId && !messageQueueInitializedRef.current) {
      console.log(`Conversation ID now available: ${conversationId}`);
      messageQueueInitializedRef.current = true;
      
      // Find any existing message queue instances and notify them
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        console.log('Notifying global message queue that conversation is initialized');
        window.attuneMessageQueue.setConversationInitialized();
      }
    }
  }, [conversationId, userId, messages]);

  return { isQueueInitialized: messageQueueInitializedRef.current };
};
