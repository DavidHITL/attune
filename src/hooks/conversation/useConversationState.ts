
import { useState, useCallback } from 'react';
import { Message } from '@/utils/types';

/**
 * Hook for managing conversation state with enhanced conversation tracking
 */
export const useConversationState = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const addLocalMessage = useCallback((message: Message) => {
    console.log(`Adding local message: ${message.role}`, {
      messageId: message.id,
      hasConversationId: !!conversationId
    });
    setMessages(prev => [...prev, message]);
  }, [conversationId]);

  return {
    conversationId,
    setConversationId,
    messages,
    setMessages,
    loading,
    setLoading,
    addLocalMessage
  };
};
