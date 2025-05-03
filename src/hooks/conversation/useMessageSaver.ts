
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { toast } from 'sonner';

export const useMessageSaver = (
  user: any, 
  conversationId: string | null,
  setConversationId: (id: string) => void,
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void,
  addLocalMessage: (message: Message) => void
) => {
  /**
   * Save a message to the database or handle it locally for anonymous users
   */
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
      
      console.log(`[useMessageSaver] Saving ${message.role} message:`, {
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
      console.log(`[useMessageSaver] Sending message to database with role=${messageToSave.role}`, {
        role: messageToSave.role,
        content: messageToSave.content.substring(0, 50),
        conversationId,
        userId: user?.id
      });

      // Import and use the saveMessageToDb function (will be passed from parent hook)
      const savedMessage = await saveMessageToDb(messageToSave);
      
      if (savedMessage) {
        console.log(`[useMessageSaver] Successfully saved ${messageToSave.role} message:`, {
          id: savedMessage.id,
          role: savedMessage.role,
          conversationId: savedMessage.conversation_id
        });
        
        // Verify that role was preserved
        if (savedMessage.role !== messageToSave.role) {
          console.error(`[useMessageSaver] ❌ ROLE MISMATCH: Expected=${messageToSave.role}, Actual=${savedMessage.role}`);
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
            console.log('[useMessageSaver] Flushing pending message queue');
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
  }, [user, conversationId, setConversationId, addLocalMessage, setMessages]);

  return { saveMessage };
};

// This is a placeholder function that will be passed from the parent hook
// It's declared here to avoid TypeScript errors in the component above
const saveMessageToDb = async (message: Message): Promise<Message | undefined> => {
  return undefined;
};

