
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { normalizeMessageRole, ensureValidMessageRole } from '@/utils/chat/messageUtils';
import { createAnonymousMessage } from '@/utils/chat/message/anonymousMessageCreator';
import { isValidMessageContent, getMessagePreview } from '@/utils/chat/message/messageValidator';

/**
 * Hook for saving messages to the database
 */
export const useSaveMessage = (
  user: any, 
  conversationId: string | null,
  validateRole: (role: string) => 'user' | 'assistant'
) => {
  const saveMessage = async (message: Partial<Message>): Promise<Message | null> => {
    const normalizedMessage = ensureValidMessageRole(message);
    
    console.log('useSaveMessage called with:', {
      userExists: !!user,
      userId: user?.id,
      conversationId,
      messageRole: normalizedMessage.role,
      messageContentLength: normalizedMessage.content?.length
    });
    
    // Skip empty messages
    if (!isValidMessageContent(normalizedMessage.content)) {
      console.warn('Skipping empty message save attempt');
      return null;
    }
    
    // Handle anonymous mode
    if (!user || !conversationId) {
      console.log(`👤 Anonymous user message processing: ${normalizedMessage.role}`);
      return createAnonymousMessage(normalizedMessage.role, normalizedMessage.content);
    }
    
    const insertData = {
      conversation_id: conversationId,
      user_id: user.id,
      role: normalizedMessage.role,
      content: normalizedMessage.content
    };
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([insertData])
        .select('id, role, content, created_at')
        .single();
        
      if (error) throw error;
      
      const savedMessage: Message = {
        id: data.id,
        role: validateRole(data.role),
        content: data.content,
        created_at: data.created_at
      };
      
      // Show success toast for user messages
      if (normalizedMessage.role === 'user') {
        toast.success('Message saved', {
          description: getMessagePreview(savedMessage.content),
          duration: 2000,
        });
      }
      
      return savedMessage;
      
    } catch (error) {
      console.error('Error saving message:', error);
      
      toast.error(`Failed to save message: ${error instanceof Error ? error.message : "Unknown error"}`, {
        duration: 4000,
      });
      
      // Return a temporary message to maintain UI consistency
      return createAnonymousMessage(normalizedMessage.role, normalizedMessage.content);
    }
  };

  return { saveMessage };
};
