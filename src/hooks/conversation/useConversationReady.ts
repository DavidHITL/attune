
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const POLL_INTERVAL = 100; // ms
const MAX_WAIT_TIME = 5000; // 5 seconds

export const useConversationReady = (conversationId: string | null) => {
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<number>();
  const { user } = useAuth();

  useEffect(() => {
    // Consider anonymous mode as "ready" since no conversation is needed
    const isAnonymousReady = !user;
    
    // Consider authenticated mode as "ready" when conversationId is available
    const isAuthenticatedReady = !!user && !!conversationId;
    
    // Set ready if either anonymous or authenticated is ready
    setIsReady(isAnonymousReady || isAuthenticatedReady);
    
    console.log(`Conversation ready state: ${isAnonymousReady || isAuthenticatedReady}`, {
      isAnonymous: !user, 
      hasConversationId: !!conversationId
    });
    
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [conversationId, user]);

  const waitForConversation = useCallback(async (): Promise<boolean> => {
    // For anonymous users, always return true since we don't need a conversation
    if (!user) {
      console.log('Anonymous user - no need to wait for conversation');
      return true;
    }
    
    // For authenticated users, check if ready
    if (isReady) return true;

    console.log('Waiting for conversation to be initialized...');
    return new Promise((resolve) => {
      let elapsedTime = 0;

      const checkConversation = () => {
        if (isReady) {
          console.log('Conversation is now ready');
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
  }, [isReady, user]);

  return {
    isReady,
    waitForConversation
  };
};
