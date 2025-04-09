
import { useAuth } from "@/context/AuthContext";
import { useConversationState } from "./conversation/useConversationState";
import { useConversationHelpers } from "./conversation/useConversationHelpers";
import { useConversationLoading } from "./conversation/useConversationLoading";
import { useSaveMessage } from "./conversation/useSaveMessage";
import { Message, UseConversationReturn } from "@/utils/types";
import { useCallback, useRef } from "react";

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

  // Save a new message
  const saveMessage = useCallback(async (message: Message): Promise<Message | null> => {
    try {
      const savedMessage = await saveMessageToDb(message);
      if (savedMessage) {
        console.log(`Successfully saved ${message.role} message to database`);
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
      
      console.log(`Created temporary message for ${message.role} due to save error`);
      setMessages(prev => [...prev, tempMessage]);
      console.error('Error in saveMessage:', error);
      throw error;
    }
  }, [saveMessageToDb, setMessages]);

  return {
    conversationId,
    messages,
    loading,
    saveMessage,
    addLocalMessage,
    loadMessages
  };
};
