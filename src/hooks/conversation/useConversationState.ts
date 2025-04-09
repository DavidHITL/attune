
import { useState } from 'react';
import { Message } from '@/utils/types';

/**
 * Hook for managing conversation state
 */
export const useConversationState = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const addLocalMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

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
