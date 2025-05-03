
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';
import { supabase } from '@/integrations/supabase/client';

export const useSaveMessageHandler = (
  user: any,
  conversationId: string | null,
  setConversationId: (id: string) => void,
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void,
  addLocalMessage: (message: Message) => void,
  saveMessageToDb: (message: Message) => Promise<Message | undefined>
) => {
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
      
      console.log(`[useSaveMessageHandler] Saving ${message.role} message:`, {
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
      
      // Use the central message service
      console.log(`[useSaveMessageHandler] Using central message service to save ${messageToSave.role} message`);
      
      // If no conversation ID, get or create one first before saving any messages
      let targetConversationId = conversationId;
      
      if (!targetConversationId) {
        try {
          console.log("[useSaveMessageHandler] No conversation ID available. Obtaining one before saving message.");
          
          // Get or create conversation using RPC function
          const { data: newConversation, error: convError } = await supabase.rpc(
            "get_or_create_conversation",
            { p_user_id: user.id }
          );
          
          if (convError) {
            console.error("[useSaveMessageHandler] Error getting/creating conversation:", convError);
            throw convError;
          }
          
          // CRITICAL FIX: Extract ID from response and set it as the conversation ID
          if (newConversation) {
            console.log("[useSaveMessageHandler] Successfully obtained conversation ID:", newConversation);
            
            // Set the ID (not the whole object)
            targetConversationId = newConversation;
            setConversationId(targetConversationId);
            
            console.log(`[useSaveMessageHandler] Set new conversation ID: ${targetConversationId}`);
            
            // Update global context
            if (typeof window !== 'undefined') {
              window.conversationContext = {
                conversationId: targetConversationId,
                userId: user?.id || null,
                isInitialized: true,
                messageCount: window.conversationContext?.messageCount || 0
              };
            }
            
            // Notify message queue
            if (typeof window !== 'undefined' && window.attuneMessageQueue) {
              console.log('[useSaveMessageHandler] Updating message queue with new conversation ID');
              window.attuneMessageQueue.setConversationInitialized();
              
              // Flush any queued messages now that we have a conversation ID
              if (window.attuneMessageQueue.forceFlushQueue) {
                console.log('[useSaveMessageHandler] Flushing pending message queue');
                window.attuneMessageQueue.forceFlushQueue();
              }
            }
          } else {
            console.error("[useSaveMessageHandler] Failed to get conversation ID - response was empty");
            throw new Error("Failed to get conversation ID");
          }
        } catch (error) {
          console.error('[useSaveMessageHandler] Error obtaining conversation ID:', error);
          toast.error("Failed to initialize conversation");
          throw error;
        }
      }
      
      // Now that we have a valid conversation ID, save the message
      if (!targetConversationId) {
        console.error("[useSaveMessageHandler] Cannot save message: Still no conversation ID after attempt to get one");
        toast.error("Cannot save message - no active conversation");
        return undefined;
      }
      
      try {
        // Add the conversation ID to the message
        messageToSave.conversation_id = targetConversationId;
        
        console.log(`[useSaveMessageHandler] Saving message with conversation ID: ${targetConversationId}`);
        
        const result = await messageSaveService.saveMessageToDatabase({
          role: messageToSave.role,
          content: messageToSave.content,
          conversation_id: targetConversationId,
          user_id: user?.id
        });
        
        if (result) {
          setMessages(prev => [...prev, result]);
          return result;
        }
      } catch (error) {
        console.error('[useSaveMessageHandler] Error saving message with conversation ID:', error);
        throw error;
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
  }, [user, conversationId, setConversationId, addLocalMessage, setMessages, saveMessageToDb]);

  return { saveMessage };
};
