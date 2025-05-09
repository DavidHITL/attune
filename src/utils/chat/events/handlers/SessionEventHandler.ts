
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateConversationId } from '@/hooks/useConversationId';

/**
 * Handles session creation events by initializing a conversation
 */
export async function handleSessionCreated(evt: any) {
  console.log('[SessionEventHandler] Session created event received:', evt);
  
  try {
    // Get current authenticated user with fresh auth check
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('[SessionEventHandler] Error getting authenticated user:', error);
      return null;
    }
    
    const user = data?.user;
    
    if (!user) {
      console.warn('[SessionEventHandler] No authenticated user found, skipping conversation initialization');
      return null;
    }
    
    console.log('[SessionEventHandler] Initializing conversation for user:', user.id);
    
    // Get or create a conversation ID for this session
    const conversationId = await getOrCreateConversationId(user.id);
    
    if (!conversationId) {
      console.error('[SessionEventHandler] Failed to get or create conversation ID');
      return null;
    }
    
    console.log('[SessionEventHandler] Conversation initialized with ID:', conversationId);
    
    // Store conversation context globally
    if (typeof window !== 'undefined') {
      // Don't overwrite existing context if it exists, just update it
      if (!window.conversationContext) {
        window.conversationContext = {
          conversationId,
          userId: user.id,
          isInitialized: true,
          messageCount: 0
        };
      } else {
        // Update existing context
        window.conversationContext.conversationId = conversationId;
        window.conversationContext.userId = user.id;
        window.conversationContext.isInitialized = true;
      }
      
      // NEW: Store conversation ID in dedicated global variable for immediate access
      window.__attuneConversationId = conversationId;
      
      console.log('[SessionEventHandler] Updated global conversation context:', 
        { conversationId, userId: user.id });
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
      userId: string;
      isInitialized: boolean;
      messageCount: number;
    };
    __attuneConversationId?: string;
  }
}
