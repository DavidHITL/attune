
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';
import { toast } from 'sonner';

/**
 * Hook for saving messages to the database
 */
export const useSaveMessage = (
  user: any, 
  conversationId: string | null,
  validateRole: (role: string) => 'user' | 'assistant'
) => {

  /**
   * Saves a new message to the database with error handling
   */
  const saveMessage = async (message: Partial<Message>): Promise<Message | null> => {
    console.log('useSaveMessage called with:', {
      userExists: !!user,
      userId: user?.id,
      conversationId,
      messageRole: message.role,
      messageContentLength: message.content?.length,
      userAuthenticated: !!supabase.auth.getSession()
    });
    
    if (!user || !conversationId) {
      console.error('Cannot save message: User not authenticated or conversation not initialized');
      console.error(`User: ${user ? 'authenticated' : 'missing'}, ConversationId: ${conversationId || 'missing'}`);
      
      // Show explicit error toast for diagnostic purposes
      toast.error(`Failed to save message: ${!user ? 'Not logged in' : 'No active conversation'}`);
      return null;
    }
    
    // Don't save empty messages
    if (!message.content || message.content.trim() === '') {
      console.warn('Skipping empty message save attempt');
      return null;
    }
    
    try {
      // Show more visible logging for user messages
      if (message.role === 'user') {
        console.log(`🔴 SAVING USER MESSAGE to conversation ${conversationId}: ${message.content?.substring(0, 30)}...`);
        toast.info("Saving user message to database", {
          description: message.content?.substring(0, 50) + (message.content && message.content.length > 50 ? "..." : ""),
          duration: 2000,
        });
      } else {
        console.log(`Saving message to conversation ${conversationId}: ${message.role} - ${message.content?.substring(0, 30)}...`);
      }
      
      // Add explicit log of the full data being inserted
      const insertData = {
        conversation_id: conversationId,
        user_id: user.id,
        role: message.role,
        content: message.content
      };
      console.log('Insert data:', JSON.stringify(insertData));
      
      // Try to get current session for debugging
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Current session status:', sessionData.session ? 'Active' : 'No session');
      
      // Add more retry logic specifically for user messages
      let retries = 0;
      const maxRetries = message.role === 'user' ? 3 : 1;
      
      while (retries <= maxRetries) {
        try {
          const { data, error } = await supabase
            .from('messages')
            .insert([insertData])
            .select('id, role, content, created_at')
            .single();
          
          if (error) {
            throw error;
          }
          
          // Add the new message to the state with validated role
          const validatedMessage: Message = {
            id: data.id,
            role: validateRole(data.role),
            content: data.content,
            created_at: data.created_at
          };
          
          console.log(`Message saved successfully with ID: ${validatedMessage.id}`);
          
          // Show success toast for user messages with ID
          if (message.role === 'user') {
            toast.success(`User message saved with ID: ${validatedMessage.id}`, {
              id: `save-success-${validatedMessage.id}`,
              duration: 2000,
            });
          }
          
          // Verify message was saved correctly
          const { data: verifyData, error: verifyError } = await supabase
            .from('messages')
            .select('id, role, content')
            .eq('id', validatedMessage.id)
            .single();
            
          if (verifyError) {
            console.error('Error verifying message was saved:', verifyError);
          } else {
            console.log('Verified message in database:', verifyData);
            if (verifyData.content !== message.content) {
              console.warn('Message content verification mismatch!');
              console.warn('Original:', message.content?.substring(0, 50));
              console.warn('Saved:', verifyData.content.substring(0, 50));
            }
          }
          
          return validatedMessage;
        } catch (error) {
          retries++;
          
          if (retries > maxRetries) {
            console.error(`Failed to save ${message.role} message after ${maxRetries} attempts:`, error);
            throw error;
          }
          
          console.log(`Retry ${retries}/${maxRetries} for saving ${message.role} message...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error saving message:', error);
      
      // Show error toast
      toast.error(`Failed to save ${message.role} message: ${error instanceof Error ? error.message : "Unknown error"}`, {
        id: `save-error-${Date.now()}`,
        duration: 4000,
      });
      
      // Try again after a brief delay for user messages only
      if (message.role === 'user') {
        try {
          console.log('Retrying save for user message after error...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data, error: retryError } = await supabase
            .from('messages')
            .insert([{
              conversation_id: conversationId,
              user_id: user.id,
              role: message.role,
              content: message.content
            }])
            .select('id, role, content, created_at')
            .single();
          
          if (retryError) {
            console.error('Error on retry saving message:', retryError);
            throw retryError;
          }
          
          const validatedMessage: Message = {
            id: data.id,
            role: validateRole(data.role),
            content: data.content,
            created_at: data.created_at
          };
          
          console.log(`User message saved successfully on retry with ID: ${validatedMessage.id}`);
          
          // Show success toast for retry
          toast.success(`User message saved on retry with ID: ${validatedMessage.id}`, {
            id: `save-retry-success-${validatedMessage.id}`,
            duration: 2000,
          });
          
          return validatedMessage;
        } catch (retryError) {
          console.error('Failed to save message after retry:', retryError);
          toast.error(`Failed to save ${message.role} message even after retry`, {
            id: `save-retry-error-${Date.now()}`,
          });
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  };

  return { saveMessage };
};
