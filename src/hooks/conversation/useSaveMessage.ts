
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { ensureValidMessageRole } from '@/utils/chat/messageUtils';
import { createAnonymousMessage } from '@/utils/chat/message/anonymousMessageCreator';
import { isValidMessageContent, getMessagePreview } from '@/utils/chat/message/messageValidator';

/**
 * Creates a new conversation for a user
 */
const createNewConversation = async (userId: string): Promise<string | null> => {
  try {
    console.log('[useSaveMessage] 🆕 Creating new conversation for user:', userId);
    const { data, error } = await supabase
      .rpc('get_or_create_conversation', {
        p_user_id: userId
      });

    if (error) {
      console.error('[useSaveMessage] ❌ Error creating conversation:', error);
      throw error;
    }

    console.log('[useSaveMessage] ✅ Successfully created/retrieved conversation:', data);
    return data;
  } catch (error) {
    console.error('[useSaveMessage] ❌ Failed to create conversation:', error);
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
    // CRITICAL FIX: Add enhanced role validation logging
    console.log('[useSaveMessage] 🔍 Message role BEFORE validation:', message.role);
    
    // Apply normalization but preserve assistant role
    const validatedMessage = ensureValidMessageRole(message);
    
    // Explicitly preserve assistant role if already set - critical fix
    if (message.role === 'assistant') {
      console.log('[useSaveMessage] ⭐ PRESERVING existing assistant role');
      validatedMessage.role = 'assistant';
    }
    
    // Additional log for role verification
    console.log('[useSaveMessage] 🔍 Final message role for saving:', validatedMessage.role);
    
    // Enhanced logging for message save attempts
    console.log('📝 [useSaveMessage] Attempt:', {
      timestamp: new Date().toISOString(),
      userExists: !!user,
      userId: user?.id,
      conversationId,
      messageRole: validatedMessage.role,
      messageContentLength: validatedMessage.content?.length,
      contentPreview: validatedMessage.content?.substring(0, 50) + '...',
      validContent: isValidMessageContent(validatedMessage.content)
    });
    
    if (!isValidMessageContent(validatedMessage.content)) {
      console.warn('⚠️ [useSaveMessage] Skipping empty message save attempt');
      return null;
    }
    
    // For anonymous users, always return a local message without database saving
    if (!user) {
      console.log(`👤 [useSaveMessage] Anonymous user message processing: ${validatedMessage.role}`);
      const anonymousMessage = createAnonymousMessage(validatedMessage.role, validatedMessage.content);
      console.log('[useSaveMessage] 📝 Anonymous message created (not saved to database):', anonymousMessage);
      return { ...anonymousMessage, conversation_id: 'anonymous' };
    }
    
    let targetConversationId = conversationId;
    
    // For authenticated users without an active conversation, create one
    if (!targetConversationId && validatedMessage.role === 'user') {
      console.log('🆕 [useSaveMessage] No conversation ID found, creating new conversation...');
      targetConversationId = await createNewConversation(user.id);
      
      if (!targetConversationId) {
        console.error('❌ [useSaveMessage] Failed to create conversation');
        toast.error('Unable to start conversation. Please try again.');
        return { ...createAnonymousMessage(validatedMessage.role, validatedMessage.content), conversation_id: 'anonymous' };
      }
      
      console.log('✅ [useSaveMessage] Created new conversation:', targetConversationId);
    }
    
    // CRITICAL FIX: Use the role directly from validatedMessage without transformation
    const insertData = {
      conversation_id: targetConversationId,
      user_id: user.id,
      role: validatedMessage.role, // Use validated role directly
      content: validatedMessage.content
    };
    
    console.log('💾 [useSaveMessage] Inserting message:', {
      timestamp: new Date().toISOString(),
      payload: insertData,
      conversationContext: {
        conversationId: targetConversationId,
        userId: user.id,
        role: validatedMessage.role
      }
    });
    
    try {
      // Add additional debugging for insert operation
      console.log(`[useSaveMessage] 🔍 Starting database insert with role: ${validatedMessage.role}`);
      
      const { data, error } = await supabase
        .from('messages')
        .insert([insertData])
        .select('id, role, content, created_at, conversation_id')
        .single();
        
      if (error) {
        console.error('❌ [useSaveMessage] Database error during message insert:', {
          error,
          errorMessage: error.message,
          errorCode: error.code,
          details: error.details,
          hint: error.hint,
          payload: insertData,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      console.log('✅ [useSaveMessage] Message saved successfully:', {
        messageId: data.id,
        conversationId: data.conversation_id,
        role: data.role,
        timestamp: new Date().toISOString(),
        contentPreview: data.content.substring(0, 50) + '...'
      });
      
      // CRITICAL FIX: Trust the role from the database without revalidation
      const savedMessage = {
        id: data.id,
        role: data.role as 'user' | 'assistant',
        content: data.content,
        created_at: data.created_at,
        conversation_id: data.conversation_id
      };
      
      // CRITICAL VALIDATION: Double-check role after database operation
      console.log(`[useSaveMessage] 🔍 Role verification after database save:`, {
        originalRole: validatedMessage.role,
        savedRole: savedMessage.role,
        roleMatches: validatedMessage.role === savedMessage.role
      });
      
      if (validatedMessage.role === 'user') {
        toast.success('Message saved', {
          description: getMessagePreview(savedMessage.content),
          duration: 2000,
        });
      }
      
      return savedMessage;
      
    } catch (error) {
      console.error('❌ [useSaveMessage] Error saving message:', {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        context: {
          conversationId: targetConversationId,
          role: validatedMessage.role
        }
      });
      
      toast.error(`Failed to save message: ${error instanceof Error ? error.message : "Unknown error"}`, {
        duration: 4000,
      });
      
      return { ...createAnonymousMessage(validatedMessage.role, validatedMessage.content), conversation_id: 'anonymous' };
    }
  };

  return { saveMessage };
};
