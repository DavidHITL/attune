
import { useCallback } from 'react';
import { useVoiceEventHandler } from '@/hooks/voice/useVoiceEventHandler';
import { useSessionHandler } from '@/hooks/voice/useSessionHandler';

/**
 * Hook for combining different message event handlers
 */
export const useMessageEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  // Use our custom hooks - pass chatClientRef to avoid circular dependencies
  const { voiceActivityState, handleVoiceEvent } = useVoiceEventHandler(chatClientRef);
  const { 
    status, setStatus, 
    isConnected, setIsConnected,
    hasContext, messageCount,
    updateMessagesContext,
    handleSessionEvent
  } = useSessionHandler();
  
  // Create a combined message handler that delegates to specific handlers
  const combinedMessageHandler = useCallback((event: any) => {
    // Process voice activity and transcript events
    handleVoiceEvent(event);
    
    // Process session creation events
    handleSessionEvent(event);
  }, [handleVoiceEvent, handleSessionEvent]);

  return {
    voiceActivityState,
    status,
    setStatus,
    isConnected, 
    setIsConnected,
    hasContext,
    messageCount,
    updateMessagesContext,
    combinedMessageHandler
  };
};
