
import { useAuth } from "@/context/AuthContext";
import { useConversationState } from "./conversation/useConversationState";
import { useConversationHelpers } from "./conversation/useConversationHelpers";
import { useConversationLoading } from "./conversation/useConversationLoading";
import { useSaveMessage } from "./conversation/useSaveMessage";
import { Message, UseConversationReturn } from "@/utils/types";
import { useCallback, useRef } from "react";
import { useConversationContext } from "./conversation/useConversationContext";
import { useSaveMessageHandler } from "./conversation/useSaveMessageHandler";

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
  
  // Use a ref to track if initialization has been done
  const initializedRef = useRef(false);
  
  const { validateRole, loadMessages: loadMessagesHelper } = useConversationHelpers();
  const { saveMessage: saveMessageToDb } = useSaveMessage(user, conversationId, validateRole);
  
  // Define loadMessages before using it in useConversationLoading
  const loadMessages = useCallback(async (convoId: string): Promise<Message[]> => {
    try {
      console.log(`Loading messages for conversation: ${convoId}`);
      const validMessages = await loadMessagesHelper(convoId);
      console.log(`Loaded ${validMessages.length} messages from database`);
      setMessages(validMessages);
      return validMessages;
    } catch (error) {
      console.error('Error in loadMessages:', error);
      throw error;
    }
  }, [loadMessagesHelper, setMessages]);

  // Initialize and load conversation when user changes, but only once
  useConversationLoading(
    user, 
    setConversationId, 
    setMessages, 
    setLoading, 
    validateRole, 
    loadMessages,
    conversationId,
    initializedRef
  );

  // Track conversation context globally
  useConversationContext(conversationId, user?.id || null, messages);

  // Use the dedicated message saver hook
  const { saveMessage } = useSaveMessageHandler(
    user,
    conversationId,
    setConversationId,
    setMessages,
    addLocalMessage, 
    saveMessageToDb
  );

  return {
    conversationId,
    messages,
    loading,
    saveMessage,
    addLocalMessage,
    loadMessages
  };
};
