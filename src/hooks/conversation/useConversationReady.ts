
import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL = 100; // ms
const MAX_WAIT_TIME = 5000; // 5 seconds

export const useConversationReady = (conversationId: string | null) => {
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<number>();

  useEffect(() => {
    // Set ready state based on conversationId
    setIsReady(!!conversationId);
    
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [conversationId]);

  const waitForConversation = useCallback(async (): Promise<boolean> => {
    if (isReady) return true;

    return new Promise((resolve) => {
      let elapsedTime = 0;

      const checkConversation = () => {
        if (isReady) {
          resolve(true);
          return;
        }

        elapsedTime += POLL_INTERVAL;
        if (elapsedTime >= MAX_WAIT_TIME) {
          console.warn('Conversation initialization timed out');
          resolve(false);
          return;
        }

        timeoutRef.current = window.setTimeout(checkConversation, POLL_INTERVAL);
      };

      checkConversation();
    });
  }, [isReady]);

  return {
    isReady,
    waitForConversation
  };
};
