
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
  const saveMessage = async (message: Partial<Message>): Promise<(Message & { conversation_id: string }) | null> => {
    const normalizedMessage = ensureValidMessageRole(message);
    const saveId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Enhanced logging for message save attempts
    console.log(`📝 [Save Message ${saveId}] Attempt:`, {
      timestamp: new Date().toISOString(),
      userExists: !!user,
      userId: user?.id,
      conversationId,
      messageRole: normalizedMessage.role,
      messageContentLength: normalizedMessage.content?.length,
      contentPreview: normalizedMessage.content?.substring(0, 50) + '...',
      validContent: isValidMessageContent(normalizedMessage.content)
    });
    
    if (!isValidMessageContent(normalizedMessage.content)) {
      console.warn(`⚠️ [Save Message ${saveId}] Skipping empty message save attempt`);
      return null;
    }
    
    // For anonymous users, always return a local message without database saving
    if (!user) {
      console.log(`👤 [Save Message ${saveId}] Anonymous user message processing: ${normalizedMessage.role}`);
      const anonymousMessage = createAnonymousMessage(normalizedMessage.role, normalizedMessage.content);
      console.log(`Anonymous message created (not saved to database): ${anonymousMessage.id}`);
      return { ...anonymousMessage, conversation_id: 'anonymous' };
    }
    
    let targetConversationId = conversationId;
    
    // For authenticated users without an active conversation, create one
    if (!targetConversationId && normalizedMessage.role === 'user') {
      console.log(`🆕 [Save Message ${saveId}] No conversation ID found, creating new conversation...`);
      targetConversationId = await createNewConversation(user.id);
      
      if (!targetConversationId) {
        console.error(`❌ [Save Message ${saveId}] Failed to create conversation`);
        toast.error('Unable to start conversation. Please try again.');
        return { ...createAnonymousMessage(normalizedMessage.role, normalizedMessage.content), conversation_id: 'anonymous' };
      }
      
      console.log(`✅ [Save Message ${saveId}] Created new conversation: ${targetConversationId}`);
    }
    
    const insertData = {
      conversation_id: targetConversationId,
      user_id: user.id,
      role: normalizedMessage.role,
      content: normalizedMessage.content
    };
    
    console.log(`💾 [Save Message ${saveId}] Inserting message:`, {
      timestamp: new Date().toISOString(),
      payload: {
        conversation_id: insertData.conversation_id,
        user_id: insertData.user_id,
        role: insertData.role,
        contentPreview: insertData.content?.substring(0, 20) + '...',
      }
    });
    
    try {
      // Add additional debugging for insert operation
      console.log(`[Save Message ${saveId}] Starting database insert with SQL: 
        INSERT INTO messages (conversation_id, user_id, role, content)
        VALUES ('${targetConversationId}', '${user.id}', '${normalizedMessage.role}', '${normalizedMessage.content?.substring(0, 20)}...')`);
      
      const startTime = performance.now();
      const { data, error } = await supabase
        .from('messages')
        .insert([insertData])
        .select('id, role, content, created_at, conversation_id')
        .single();
      const endTime = performance.now();
        
      if (error) {
        console.error(`❌ [Save Message ${saveId}] Database error during message insert:`, {
          error,
          errorMessage: error.message,
          errorCode: error.code,
          details: error.details,
          hint: error.hint,
          payload: {
            conversation_id: insertData.conversation_id,
            role: insertData.role,
          },
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      console.log(`✅ [Save Message ${saveId}] Message saved successfully in ${Math.round(endTime - startTime)}ms:`, {
        messageId: data.id,
        conversationId: data.conversation_id,
        role: data.role,
        timestamp: new Date().toISOString(),
        contentPreview: data.content.substring(0, 50) + '...'
      });
      
      const savedMessage = {
        id: data.id,
        role: validateRole(data.role),
        content: data.content,
        created_at: data.created_at,
        conversation_id: data.conversation_id
      };
      
      if (normalizedMessage.role === 'user') {
        toast.success('Message saved', {
          description: getMessagePreview(savedMessage.content),
          duration: 2000,
        });
      }
      
      return savedMessage;
      
    } catch (error) {
      console.error(`❌ [Save Message ${saveId}] Error saving message:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        context: {
          conversationId: targetConversationId,
          role: normalizedMessage.role
        }
      });
      
      toast.error(`Failed to save message: ${error instanceof Error ? error.message : "Unknown error"}`, {
        duration: 4000,
      });
      
      return { ...createAnonymousMessage(normalizedMessage.role, normalizedMessage.content), conversation_id: 'anonymous' };
    }
  };

  return { saveMessage };
};

