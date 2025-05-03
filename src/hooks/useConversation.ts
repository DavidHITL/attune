
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

  // Track conversation state globally
  useEffect(() => {
    // Create or update the global conversation context
    if (typeof window !== 'undefined') {
      window.conversationContext = {
        conversationId,
        userId: user?.id || null,
        isInitialized: !!conversationId,
        messageCount: messages.length
      };
      
      console.log(`[useConversation] Updated global conversation context:`, {
        conversationId,
        userId: user?.id || null,
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
  }, [conversationId, user, messages]);

  // Enhanced saveMessage with conversation ID handling
  const saveMessage = useCallback(async (message: Partial<Message>): Promise<Message | undefined> => {
    try {
      if (!message.role || !message.content) {
        console.error('Cannot save message: Missing role or content');
        return;
      }
      
      // CRITICAL FIX #1: Ensure role is valid before proceeding
      if (message.role !== 'user' && message.role !== 'assistant') {
        console.error(`Cannot save message: Invalid role "${message.role}". Must be 'user' or 'assistant'`);
        throw new Error(`Invalid message role: ${message.role}`);
      }
      
      console.log(`[useConversation] Saving ${message.role} message:`, {
        role: message.role,
        contentPreview: message.content.substring(0, 30) + '...',
        hasConversationId: !!conversationId,
        hasUser: !!user,
        timestamp: new Date().toISOString()
      });
      
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
      
      // CRITICAL FIX #2: Create a clean object with explicitly assigned role
      const messageToSave: Message = {
        id: message.id || `temp-${Date.now()}`,
        role: message.role as 'user' | 'assistant',
        content: message.content,
        created_at: message.created_at || new Date().toISOString()
      };
      
      // Log the exact message being sent to the database
      console.log(`[useConversation] Sending message to database with role=${messageToSave.role}`, {
        role: messageToSave.role,
        content: messageToSave.content.substring(0, 50),
        conversationId,
        userId: user?.id
      });
      
      const savedMessage = await saveMessageToDb(messageToSave);
      
      if (savedMessage) {
        console.log(`[useConversation] Successfully saved ${messageToSave.role} message:`, {
          id: savedMessage.id,
          role: savedMessage.role,
          conversationId: savedMessage.conversation_id
        });
        
        // Verify that role was preserved
        if (savedMessage.role !== messageToSave.role) {
          console.error(`[useConversation] ❌ ROLE MISMATCH: Expected=${messageToSave.role}, Actual=${savedMessage.role}`);
          toast.error(`Role mismatch error: ${messageToSave.role} → ${savedMessage.role}`, { 
            duration: 5000 
          });
        }
        
        // Update conversation ID if a new one was created
        if (!conversationId && savedMessage.conversation_id) {
          console.log('Setting new conversation ID:', savedMessage.conversation_id);
          setConversationId(savedMessage.conversation_id);
          
          // NEW: Flush any queued messages now that we have a conversation ID
          if (window.attuneMessageQueue?.forceFlushQueue) {
            console.log('[useConversation] Flushing pending message queue');
            window.attuneMessageQueue.forceFlushQueue();
          }
        
          // Update global context with all required properties
          if (typeof window !== 'undefined') {
            window.conversationContext = {
              conversationId: savedMessage.conversation_id,
              userId: user?.id || null, // Ensure userId is always provided (can be null)
              isInitialized: true,
              messageCount: messages.length // Use current message count
            };
          }
        
          // Also notify message queue if it exists
          if (typeof window !== 'undefined' && window.attuneMessageQueue && !window.attuneMessageQueue.isInitialized()) {
            window.attuneMessageQueue.setConversationInitialized();
          }
        }
      
        setMessages(prev => [...prev, savedMessage]);
        return savedMessage;
      }
      return undefined;
    
    } catch (error) {
      console.error('Error in saveMessage:', error);
      
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
  }, [saveMessageToDb, setMessages, addLocalMessage, user, conversationId, setConversationId, messages.length]);

  return {
    conversationId,
    messages,
    loading,
    saveMessage,
    addLocalMessage,
    loadMessages
  };
};
