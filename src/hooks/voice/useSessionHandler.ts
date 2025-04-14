
import { useCallback } from 'react';
import { useContextStatus } from '@/hooks/voice/useContextStatus';

/**
 * Hook for managing session creation and context
 */
export const useSessionHandler = () => {
  const { 
    status, setStatus, 
    isConnected, setIsConnected,
    hasContext, messageCount,
    handleSessionCreated, updateMessagesContext
  } = useContextStatus();
  
  const handleSessionEvent = useCallback((event: any) => {
    // Process session creation events
    handleSessionCreated(event);
  }, [handleSessionCreated]);

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
