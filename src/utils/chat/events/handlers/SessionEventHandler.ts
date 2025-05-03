
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateConversationId } from '@/hooks/useConversationId';

/**
 * Handles session creation events by initializing a conversation
 */
export async function handleSessionCreated(evt: any) {
  console.log('[SessionEventHandler] Session created event received:', evt);
  
  try {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[SessionEventHandler] No authenticated user found, skipping conversation initialization');
      return;
    }
    
    console.log('[SessionEventHandler] Initializing conversation for user:', user.id);
    
    // Get or create a conversation ID for this session
    const conversationId = await getOrCreateConversationId(user.id);
    
    console.log('[SessionEventHandler] Conversation initialized with ID:', conversationId);
    
    // Store conversation context globally if needed
    if (typeof window !== 'undefined' && !window.conversationContext) {
      window.conversationContext = { conversationId };
    }
    
    return conversationId;
  } catch (error) {
    console.error('[SessionEventHandler] Failed to initialize conversation:', error);
    throw error;
  }
}

// Extending Window interface to include conversation context
declare global {
  interface Window {
    conversationContext?: {
      conversationId: string;
    };
  }
}
