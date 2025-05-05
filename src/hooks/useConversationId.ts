
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Extending Window interface to include our global variable
declare global {
  interface Window {
    __attuneConversationId?: string;
  }
}

/**
 * Hook for managing conversation ID state
 */
export const useConversationId = () => {
  const [conversationId, setConversationId] = useState<string | null>(
    window.__attuneConversationId || null
  );

  const getOrCreateConversation = useCallback(async (userId: string) => {
    const id = await getOrCreateConversationId(userId);
    setConversationId(id);
    return id;
  }, []);

  return {
    conversationId,
    setConversationId,
    getOrCreateConversation
  };
};

/**
 * Gets an existing conversation ID from cache or creates a new one.
 * This is a standalone function that can be used outside of the hook.
 */
export async function getOrCreateConversationId(userId: string) {
  // Return cached id if we already made one this session
  if (window.__attuneConversationId) {
    console.log(`[getOrCreateConversationId] Using cached conversation ID: ${window.__attuneConversationId}`);
    return window.__attuneConversationId;
  }

  try {
    console.log(`[getOrCreateConversationId] Getting or creating conversation for user: ${userId}`);
    
    // Use the RPC function to get or create a conversation
    const { data, error } = await supabase.rpc(
      "get_or_create_conversation",
      { p_user_id: userId }
    );

    if (error) {
      console.error(`[getOrCreateConversationId] Error from RPC:`, error);
      throw error;
    }

    if (!data) {
      console.error(`[getOrCreateConversationId] No data returned from RPC`);
      throw new Error('Failed to get or create conversation');
    }

    console.log(`[getOrCreateConversationId] Successfully obtained conversation ID: ${data}`);
    window.__attuneConversationId = data;
    
    // Dispatch event to notify other components
    document.dispatchEvent(
      new CustomEvent('conversationIdReady', { 
        detail: { conversationId: data } 
      })
    );
    
    return data;
  } catch (error) {
    console.error(`[getOrCreateConversationId] Error:`, error);
    throw error;
  }
}
