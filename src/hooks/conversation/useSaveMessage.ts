
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
    console.log('[useSaveMessage] 🔍 Message role BEFORE normalization:', message.role);
    
    // Apply normalization but preserve assistant role
    const normalizedMessage = ensureValidMessageRole(message);
    
    // Log role after normalization
    console.log('[useSaveMessage] 🔍 Message role AFTER normalization:', normalizedMessage.role);
    
    // Enhanced logging for message save attempts
    console.log('📝 [useSaveMessage] Attempt:', {
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
      console.warn('⚠️ [useSaveMessage] Skipping empty message save attempt');
      return null;
    }
    
    // For anonymous users, always return a local message without database saving
    if (!user) {
      console.log(`👤 [useSaveMessage] Anonymous user message processing: ${normalizedMessage.role}`);
      const anonymousMessage = createAnonymousMessage(normalizedMessage.role, normalizedMessage.content);
      console.log('[useSaveMessage] 📝 Anonymous message created (not saved to database):', anonymousMessage);
      return { ...anonymousMessage, conversation_id: 'anonymous' };
    }
    
    let targetConversationId = conversationId;
    
    // For authenticated users without an active conversation, create one
    if (!targetConversationId && normalizedMessage.role === 'user') {
      console.log('🆕 [useSaveMessage] No conversation ID found, creating new conversation...');
      targetConversationId = await createNewConversation(user.id);
      
      if (!targetConversationId) {
        console.error('❌ [useSaveMessage] Failed to create conversation');
        toast.error('Unable to start conversation. Please try again.');
        return { ...createAnonymousMessage(normalizedMessage.role, normalizedMessage.content), conversation_id: 'anonymous' };
      }
      
      console.log('✅ [useSaveMessage] Created new conversation:', targetConversationId);
    }
    
    // CRITICAL FIX: Ensure we're using the normalized role without transforming it
    const insertData = {
      conversation_id: targetConversationId,
      user_id: user.id,
      role: normalizedMessage.role, // Use normalized role directly
      content: normalizedMessage.content
    };
    
    console.log('💾 [useSaveMessage] Inserting message:', {
      timestamp: new Date().toISOString(),
      payload: insertData,
      conversationContext: {
        conversationId: targetConversationId,
        userId: user.id,
        role: normalizedMessage.role
      }
    });
    
    try {
      // Add additional debugging for insert operation
      console.log(`[useSaveMessage] 🔍 Starting database insert with SQL: 
        INSERT INTO messages (conversation_id, user_id, role, content)
        VALUES ('${targetConversationId}', '${user.id}', '${normalizedMessage.role}', '${normalizedMessage.content?.substring(0, 20)}...')`);
      
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
      
      // CRITICAL FIX: Don't transform the role again with validateRole
      // Instead, ensure we're getting the correct role from the database
      const savedMessage = {
        id: data.id,
        role: data.role as 'user' | 'assistant', // Trust the database role
        content: data.content,
        created_at: data.created_at,
        conversation_id: data.conversation_id
      };
      
      // CRITICAL VALIDATION: Double-check role after database operation
      console.log(`[useSaveMessage] 🔍 Role verification after database save:`, {
        originalRole: normalizedMessage.role,
        savedRole: savedMessage.role,
        roleMatches: normalizedMessage.role === savedMessage.role
      });
      
      if (normalizedMessage.role === 'user') {
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
