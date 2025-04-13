
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
    if (!user || !conversationId) {
      console.error('Cannot save message: User not authenticated or conversation not initialized');
      console.error(`User: ${user ? 'authenticated' : 'missing'}, ConversationId: ${conversationId || 'missing'}`);
      return null;
    }
    
    // Don't save empty messages
    if (!message.content || message.content.trim() === '') {
      console.warn('Skipping empty message save attempt');
      return null;
    }
    
    try {
      // Add explicit toast notification for user message saving
      if (message.role === 'user') {
        console.log(`SAVING USER MESSAGE to conversation ${conversationId}: ${message.content?.substring(0, 30)}...`);
        // Only show toast in development or if saving fails
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
      
      const { data, error } = await supabase
        .from('messages')
        .insert([insertData])
        .select('id, role, content, created_at')
        .single();
      
      if (error) {
        console.error('Error saving message:', error);
        // Show toast for error
        toast.error(`Failed to save ${message.role} message: ${error.message}`, {
          id: `save-error-${Date.now()}`,
        });
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

      // Show success toast for user messages only in development
      if (message.role === 'user') {
        toast.success(`User message saved`, {
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
      console.error('Error saving message:', error);
      
      // Try again after a brief delay
      try {
        console.log('Retrying save message after error...');
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
        
        console.log(`Message saved successfully on retry with ID: ${validatedMessage.id}`);
        return validatedMessage;
      } catch (retryError) {
        console.error('Failed to save message after retry:', retryError);
        toast.error(`Failed to save ${message.role} message even after retry`, {
          id: `save-retry-error-${Date.now()}`,
        });
        throw retryError;
      }
    }
  };

  return { saveMessage };
};
