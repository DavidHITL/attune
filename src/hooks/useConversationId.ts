
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Extending Window interface to include our global variable
declare global {
  interface Window {
    __attuneConversationId?: string;
  }
}

// Export the original function as well
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

// Create and export the hook that was missing
export const useConversationId = () => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(
    window.__attuneConversationId || null
  );

  // Function to create or get the conversation ID
  const createConversation = useCallback(async () => {
    if (!user) {
      console.log('[useConversationId] No user available, cannot create conversation');
      return;
    }
    
    try {
      const id = await getOrCreateConversationId(user.id);
      setConversationId(id);
      return id;
    } catch (error) {
      console.error('[useConversationId] Error creating conversation:', error);
    }
  }, [user]);

  // Reset conversation ID
  const resetConversationId = useCallback(() => {
    setConversationId(null);
    if (window.__attuneConversationId) {
      delete window.__attuneConversationId;
    }
  }, []);

  // Listen for conversation ID ready events
  useEffect(() => {
    const handleConversationIdReady = (event: CustomEvent) => {
      if (event.detail?.conversationId) {
        setConversationId(event.detail.conversationId);
      }
    };

    // Use the global ID if already set
    if (window.__attuneConversationId) {
      setConversationId(window.__attuneConversationId);
    }

    // Add event listener for conversation ID ready events
    document.addEventListener(
      'conversationIdReady', 
      handleConversationIdReady as EventListener
    );

    return () => {
      document.removeEventListener(
        'conversationIdReady', 
        handleConversationIdReady as EventListener
      );
    };
  }, []);

  return {
    conversationId,
    setConversationId,
    createConversation,
    resetConversationId,
    isInitialized: !!conversationId
  };
};
