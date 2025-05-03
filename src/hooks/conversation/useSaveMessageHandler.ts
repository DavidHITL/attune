
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
      
      // Ensure role is valid before proceeding
      if (message.role !== 'user' && message.role !== 'assistant') {
        throw new Error(`Invalid message role: ${message.role}`);
      }
      
      // Verify current auth state to ensure we have latest user
      let currentUser = user;
      if (!currentUser) {
        const { data } = await supabase.auth.getUser();
        currentUser = data?.user;
      }
      
      // For anonymous users, handle locally
      if (!currentUser) {
        const localMessage: Message = {
          id: `anon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role: message.role as 'user' | 'assistant',
          content: message.content,
          created_at: new Date().toISOString()
        };
        
        addLocalMessage(localMessage);
        return localMessage;
      }
      
      // Create a clean object with explicitly assigned role
      const messageToSave: Message = {
        id: message.id || `temp-${Date.now()}`,
        role: message.role as 'user' | 'assistant',
        content: message.content,
        created_at: message.created_at || new Date().toISOString(),
      };
      
      // If no conversation ID, get or create one first before saving any messages
      let targetConversationId = conversationId;
      
      if (!targetConversationId) {
        try {
          // Get or create conversation using RPC function
          const { data: newConversationId, error: convError } = await supabase.rpc(
            "get_or_create_conversation",
            { p_user_id: currentUser.id }
          );
          
          if(!newConversationId) {
            throw new Error('get_or_create_conversation returned no id');
          }
          
          if (convError) {
            throw convError;
          }
          
          // Store only the ID string, not the whole object
          targetConversationId = newConversationId;
          setConversationId(targetConversationId);
          
          // Update global context
          if (typeof window !== 'undefined') {
            window.conversationContext = {
              conversationId: targetConversationId,
              userId: currentUser?.id || null,
              isInitialized: true,
              messageCount: window.conversationContext?.messageCount || 0
            };
          }
          
          // Cache ID for the session
          if (typeof window !== 'undefined') {
            window.__attuneConversationId = targetConversationId;
          }
          
          // Notify message queue
          if (typeof window !== 'undefined' && window.attuneMessageQueue) {
            window.attuneMessageQueue.setConversationInitialized();
            
            // Flush any queued messages now that we have a conversation ID
            if (window.attuneMessageQueue.forceFlushQueue) {
              window.attuneMessageQueue.forceFlushQueue();
            }
          }
        } catch (error) {
          toast.error("Failed to initialize conversation");
          throw error;
        }
      }
      
      // Now that we have a valid conversation ID, save the message
      if (!targetConversationId) {
        toast.error("Cannot save message - no active conversation");
        return undefined;
      }
      
      try {
        const result = await messageSaveService.saveMessageToDatabase({
          role: messageToSave.role,
          content: messageToSave.content,
          conversation_id: targetConversationId,
          user_id: currentUser.id
        });
        
        if (result) {
          setMessages(prev => [...prev, result]);
          return result;
        }
      } catch (error) {
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
      
      setMessages(prev => [...prev, tempMessage]);
      return tempMessage;
    }
  }, [user, conversationId, setConversationId, addLocalMessage, setMessages, saveMessageToDb]);

  return { saveMessage };
};
