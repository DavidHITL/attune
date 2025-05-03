
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { toast } from 'sonner';

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
      
      // Log the exact message being sent to the database
      console.log(`[useSaveMessageHandler] Sending message to database with role=${messageToSave.role}`, {
        role: messageToSave.role,
        content: messageToSave.content.substring(0, 50),
        conversationId,
        userId: user?.id
      });
      
      const savedMessage = await saveMessageToDb(messageToSave);
      
      if (savedMessage) {
        console.log(`[useSaveMessageHandler] Successfully saved ${messageToSave.role} message:`, {
          id: savedMessage.id,
          role: savedMessage.role,
          conversationId: savedMessage.conversation_id
        });
        
        // Verify that role was preserved
        if (savedMessage.role !== messageToSave.role) {
          console.error(`[useSaveMessageHandler] ❌ ROLE MISMATCH: Expected=${messageToSave.role}, Actual=${savedMessage.role}`);
          toast.error(`Role mismatch error: ${messageToSave.role} → ${savedMessage.role}`, { 
            duration: 5000 
          });
        }
        
        // Update conversation ID if a new one was created
        if (!conversationId && savedMessage.conversation_id) {
          console.log('Setting new conversation ID:', savedMessage.conversation_id);
          setConversationId(savedMessage.conversation_id);
          
          // NEW: Flush any queued messages now that we have a conversation ID
          if (typeof window !== 'undefined' && window.attuneMessageQueue?.forceFlushQueue) {
            console.log('[useSaveMessageHandler] Flushing pending message queue');
            window.attuneMessageQueue.forceFlushQueue();
          }
        
          // Update global context with all required properties
          if (typeof window !== 'undefined') {
            window.conversationContext = {
              conversationId: savedMessage.conversation_id,
              userId: user?.id || null,
              isInitialized: true,
              messageCount: window.conversationContext?.messageCount || 0
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
  }, [user, conversationId, setConversationId, addLocalMessage, setMessages, saveMessageToDb]);

  return { saveMessage };
};
