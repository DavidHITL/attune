
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export const useConversationReady = (conversationId: string | null) => {
  const [isReady, setIsReady] = useState(!!conversationId);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 10;
  const retryDelay = 300;

  useEffect(() => {
    if (conversationId) {
      console.log('[ConversationReady] Conversation ID available:', conversationId);
      setIsReady(true);
    } else {
      console.log('[ConversationReady] No conversation ID yet');
      setIsReady(false);
    }
  }, [conversationId]);

  /**
   * Wait until the conversation is ready (has a valid ID)
   */
  const waitForConversation = useCallback(async (): Promise<void> => {
    if (isReady && conversationId) {
      console.log('[ConversationReady] Conversation already ready:', conversationId);
      return Promise.resolve();
    }

    console.log('[ConversationReady] Waiting for conversation to be ready...');
    setRetryCount(0);
    
    return new Promise((resolve, reject) => {
      let currentRetries = 0;
      
      const checkIfReady = () => {
        if (conversationId) {
          console.log('[ConversationReady] Conversation now ready:', conversationId);
          setIsReady(true);
          resolve();
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
  }, [conversationId, isReady]);

  return {
    isConversationReady: isReady,
    waitForConversation,
    retryCount
  };
};
