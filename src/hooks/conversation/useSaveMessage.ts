
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { normalizeMessageRole, ensureValidMessageRole } from '@/utils/chat/messageUtils';
import { createAnonymousMessage } from '@/utils/chat/message/anonymousMessageCreator';
import { isValidMessageContent, getMessagePreview } from '@/utils/chat/message/messageValidator';

/**
 * Creates a new conversation for a user
 */
const createNewConversation = async (userId: string): Promise<string | null> => {
  try {
    console.log('Creating new conversation for user:', userId);
    const { data, error } = await supabase
      .rpc('get_or_create_conversation', {
        p_user_id: userId
      });

    if (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }

    console.log('Successfully created/retrieved conversation:', data);
    return data;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return null;
  }
};

/**
 * Hook for saving messages to the database with proper conversation handling
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
      messageContentLength: normalizedMessage.content?.length,
      content: normalizedMessage.content?.substring(0, 50)
    });
    
    // Skip empty messages
    if (!isValidMessageContent(normalizedMessage.content)) {
      console.warn('Skipping empty message save attempt');
      return null;
    }
    
    // Handle anonymous mode
    if (!user) {
      console.log(`👤 Anonymous user message processing: ${normalizedMessage.role}`);
      return createAnonymousMessage(normalizedMessage.role, normalizedMessage.content);
    }
    
    // Ensure we have a valid conversation ID for authenticated users
    let targetConversationId = conversationId;
    
    if (!targetConversationId && normalizedMessage.role === 'user') {
      console.log('No conversation ID found, creating new conversation...');
      targetConversationId = await createNewConversation(user.id);
      
      if (!targetConversationId) {
        console.error('Failed to create conversation');
        toast.error('Unable to start conversation. Please try again.');
        return createAnonymousMessage(normalizedMessage.role, normalizedMessage.content);
      }
      
      console.log('Created new conversation:', targetConversationId);
    }
    
    const insertData = {
      conversation_id: targetConversationId,
      user_id: user.id,
      role: normalizedMessage.role,
      content: normalizedMessage.content
    };
    
    console.log('Attempting to insert message:', insertData);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([insertData])
        .select('id, role, content, created_at')
        .single();
        
      if (error) {
        console.error('Database error during message insert:', error);
        throw error;
      }
      
      console.log('Message saved successfully:', data);
      
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
