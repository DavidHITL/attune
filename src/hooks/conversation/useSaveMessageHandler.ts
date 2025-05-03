
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

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
      
      console.log(`[useSaveMessageHandler] Using central message service to save ${messageToSave.role} message`);
      
      // Use the central save service directly if no conversation ID
      if (!conversationId) {
        // Get or create conversation first
        try {
          // This part will be handled by the MessageSaveService
          const savedMessage = await saveMessageToDb(messageToSave);
          
          if (savedMessage) {
            setMessages(prev => [...prev, savedMessage]);
            
            // Update conversation ID if a new one was created
            if (savedMessage.conversation_id) {
              console.log('Setting new conversation ID:', savedMessage.conversation_id);
              setConversationId(savedMessage.conversation_id);
              
              // Flush any queued messages now that we have a conversation ID
              if (typeof window !== 'undefined' && window.attuneMessageQueue?.forceFlushQueue) {
                console.log('[useSaveMessageHandler] Flushing pending message queue');
                window.attuneMessageQueue.forceFlushQueue();
              }
              
              // Update global context
              if (typeof window !== 'undefined') {
                window.conversationContext = {
                  conversationId: savedMessage.conversation_id,
                  userId: user?.id || null,
                  isInitialized: true,
                  messageCount: window.conversationContext?.messageCount || 0
                };
              }
              
              // Notify message queue
              if (typeof window !== 'undefined' && window.attuneMessageQueue && !window.attuneMessageQueue.isInitialized()) {
                window.attuneMessageQueue.setConversationInitialized();
              }
            }
            
            return savedMessage;
          }
        } catch (error) {
          console.error('[useSaveMessageHandler] Error saving message with no conversation ID:', error);
          throw error;
        }
      } else {
        // We have a conversation ID, use it
        try {
          const result = await messageSaveService.saveMessageToDatabase({
            role: messageToSave.role,
            content: messageToSave.content,
            conversation_id: conversationId,
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
