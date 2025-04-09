
import { useAuth } from "@/context/AuthContext";
import { useConversationState } from "./conversation/useConversationState";
import { useConversationHelpers } from "./conversation/useConversationHelpers";
import { useConversationLoading } from "./conversation/useConversationLoading";
import { useSaveMessage } from "./conversation/useSaveMessage";
import { Message, UseConversationReturn } from "@/utils/types";

export type { Message };

/**
 * Hook for managing conversation state and interactions with the database
 */
export const useConversation = (): UseConversationReturn => {
  const { user } = useAuth();
  const { 
    conversationId, setConversationId,
    messages, setMessages,
    loading, setLoading,
    addLocalMessage
  } = useConversationState();
  
  const { validateRole, loadMessages: loadMessagesHelper } = useConversationHelpers();
  const { saveMessage: saveMessageToDb } = useSaveMessage(user, conversationId, validateRole);
  
  // Initialize and load conversation when user changes
  useConversationLoading(
    user, 
    setConversationId, 
    setMessages, 
    setLoading, 
    validateRole, 
    loadMessages
  );

  // Load messages for a conversation
  const loadMessages = async (convoId: string): Promise<Message[]> => {
    try {
      const validMessages = await loadMessagesHelper(convoId);
      setMessages(validMessages);
      return validMessages;
    } catch (error) {
      console.error('Error in loadMessages:', error);
      throw error;
    }
  };

  // Save a new message
  const saveMessage = async (message: Message): Promise<Message | null> => {
    try {
      const savedMessage = await saveMessageToDb(message);
      if (savedMessage) {
        setMessages(prev => [...prev, savedMessage]);
      }
      return savedMessage;
    } catch (error) {
      // Create a temporary message so UI remains consistent
      const tempMessage: Message = {
        id: `temp-${new Date().getTime()}`,
        role: message.role,
        content: message.content,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempMessage]);
      console.error('Error in saveMessage:', error);
      throw error;
    }
  };

  return {
    conversationId,
    messages,
    loading,
    saveMessage,
    addLocalMessage,
    loadMessages
  };
};
