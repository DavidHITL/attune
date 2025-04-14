import { useAuth } from "@/context/AuthContext";
import { useConversationState } from "./conversation/useConversationState";
import { useConversationHelpers } from "./conversation/useConversationHelpers";
import { useConversationLoading } from "./conversation/useConversationLoading";
import { useSaveMessage } from "./conversation/useSaveMessage";
import { Message, UseConversationReturn } from "@/utils/types";
import { useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

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
  const messageQueueInitializedRef = useRef(false);
  
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

  // Signal to any message queues that the conversation is initialized when ID is set
  useEffect(() => {
    if (conversationId && !messageQueueInitializedRef.current) {
      console.log(`Conversation ID now available: ${conversationId}`);
      messageQueueInitializedRef.current = true;
      
      // Find any existing message queue instances and notify them
      if (window.attuneMessageQueue) {
        console.log('Notifying global message queue that conversation is initialized');
        window.attuneMessageQueue.setConversationInitialized();
      }
    }
  }, [conversationId]);

  // Enhanced saveMessage with conversation ID handling and message queuing awareness
  const saveMessage = useCallback(async (message: Partial<Message>): Promise<Message | null> => {
    try {
      if (!message.role || !message.content) {
        console.error('Cannot save message: Missing role or content');
        return null;
      }
      
      // For anonymous users, handle locally
      if (!user) {
        console.log("Anonymous user detected, using local message only");
        const localMessage: Message = {
          id: `anon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role: message.role as 'user' | 'assistant',
          content: message.content,
          created_at: new Date().toISOString()
        };
        
        addLocalMessage(localMessage);
        return localMessage;
      }
      
      // For authenticated users, ensure conversationId exists
      let targetConversationId = conversationId;
      
      if (!targetConversationId && message.role === 'user') {
        console.log('No conversation ID found, creating new conversation...');
        const savedMessage = await saveMessageToDb(message as Message);
        
        if (savedMessage) {
          console.log(`Successfully saved ${message.role} message with new conversation`);
          setMessages(prev => [...prev, savedMessage]);
          return savedMessage;
        }
        return null;
      }
      
      // Standard message save with existing conversation
      console.log(`Saving ${message.role} message to database with conversation ID: ${targetConversationId}`);
      const savedMessage = await saveMessageToDb(message as Message);
      
      if (savedMessage) {
        console.log(`Successfully saved ${message.role} message to database with ID: ${savedMessage.id}`);
        setMessages(prev => [...prev, savedMessage]);
        return savedMessage;
      }
      return null;
    } catch (error) {
      console.error('Error in saveMessage:', error);
      
      // Create a temporary message for UI consistency
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        role: message.role as 'user' | 'assistant',
        content: message.content || '',
        created_at: new Date().toISOString()
      };
      
      console.log(`Created temporary message for ${message.role} due to save error`);
      setMessages(prev => [...prev, tempMessage]);
      return tempMessage;
    }
  }, [saveMessageToDb, setMessages, addLocalMessage, user, conversationId]);

  return {
    conversationId,
    messages,
    loading,
    saveMessage,
    addLocalMessage,
    loadMessages
  };
};

// Add a global reference to the message queue for cross-component communication
declare global {
  interface Window {
    attuneMessageQueue?: {
      setConversationInitialized: () => void;
    }
  }
}
