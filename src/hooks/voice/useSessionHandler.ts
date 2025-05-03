
import { useCallback } from 'react';
import { useContextStatus } from '@/hooks/voice/useContextStatus';
import { handleSessionCreated } from '@/utils/chat/events/handlers/SessionEventHandler';

/**
 * Hook for managing session creation and context
 */
export const useSessionHandler = () => {
  const { 
    status, setStatus, 
    isConnected, setIsConnected,
    hasContext, messageCount,
    updateMessagesContext
  } = useContextStatus();
  
  const handleSessionEvent = useCallback((event: any) => {
    // Process session creation events
    handleSessionCreated(event);
  }, []);

  return {
    status,
    setStatus,
    isConnected, 
    setIsConnected,
    hasContext,
    messageCount,
    updateMessagesContext,
    handleSessionEvent
  };
};
