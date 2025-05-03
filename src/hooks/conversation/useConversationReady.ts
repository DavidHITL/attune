
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export const useConversationReady = (conversationId: string | null) => {
  const [isReady, setIsReady] = useState(!!conversationId);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 10;
  const retryDelay = 300;

  // Set up event listener for conversation ID ready event
  useEffect(() => {
    // First check if we already have a conversation ID
    if (conversationId) {
      console.log('[ConversationReady] Conversation ID available:', conversationId);
      setIsReady(true);
      return;
    }
    
    // Next check if it exists in global context
    if (typeof window !== 'undefined') {
      if (window.__attuneConversationId) {
        console.log('[ConversationReady] Found conversation ID in global context:', window.__attuneConversationId);
        setIsReady(true);
        return;
      }
    }

    console.log('[ConversationReady] No conversation ID yet, setting up event listener');

    // Set up listener for when conversation ID becomes ready
    const handleConversationReady = (event: any) => {
      const id = event.detail?.conversationId;
      if (id) {
        console.log('[ConversationReady] Received conversation ID from event:', id);
        setIsReady(true);
      }
    };

    document.addEventListener('conversationIdReady', handleConversationReady);

    return () => {
      document.removeEventListener('conversationIdReady', handleConversationReady);
    };
  }, [conversationId]);

  /**
   * Wait until the conversation is ready (has a valid ID)
   */
  const waitForConversation = useCallback(async (): Promise<string | null> => {
    // First, check if we already have conversationId in props
    if (isReady && conversationId) {
      console.log('[ConversationReady] Conversation already ready:', conversationId);
      return conversationId;
    }
    
    // Second, check if it's available in the global context
    if (typeof window !== 'undefined' && window.__attuneConversationId) {
      console.log('[ConversationReady] Found conversation ID in global context:', window.__attuneConversationId);
      setIsReady(true);
      return window.__attuneConversationId;
    }

    console.log('[ConversationReady] Waiting for conversation to be ready...');
    setRetryCount(0);
    
    return new Promise((resolve, reject) => {
      let currentRetries = 0;
      
      const checkIfReady = () => {
        // Check props first
        if (conversationId) {
          console.log('[ConversationReady] Conversation now ready from props:', conversationId);
          setIsReady(true);
          resolve(conversationId);
          return;
        }
        
        // Check global context next
        if (typeof window !== 'undefined' && window.__attuneConversationId) {
          console.log('[ConversationReady] Conversation now ready from global:', window.__attuneConversationId);
          setIsReady(true);
          resolve(window.__attuneConversationId);
          return;
        }

        currentRetries++;
        setRetryCount(currentRetries);
        
        if (currentRetries >= maxRetries) {
          const error = new Error(`Timed out waiting for conversation after ${maxRetries} attempts`);
          console.error('[ConversationReady] Timeout waiting for conversation:', error);
          toast.error("Failed to initialize conversation");
          reject(error);
          return;
        }

        console.log(`[ConversationReady] Not ready yet, retry ${currentRetries}/${maxRetries}`);
        setTimeout(checkIfReady, retryDelay);
      };

      checkIfReady();
    });
  }, [conversationId, isReady, maxRetries, retryDelay]);

  return {
    isConversationReady: isReady,
    waitForConversation,
    retryCount
  };
};
