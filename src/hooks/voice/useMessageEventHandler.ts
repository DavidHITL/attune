
import { useCallback } from 'react';
import { useVoiceEventHandler } from '@/hooks/voice/useVoiceEventHandler';
import { useSessionHandler } from '@/hooks/voice/useSessionHandler';
import { useChatEventDistributor } from './event-handlers/useChatEventDistributor';

/**
 * Hook for combining different message event handlers
 */
export const useMessageEventHandler = () => {
  // Use our custom hooks for handling different aspects of the chat
  const { voiceActivityState, handleVoiceEvent } = useVoiceEventHandler();
  const { 
    status, setStatus, 
    isConnected, setIsConnected,
    hasContext, messageCount,
    updateMessagesContext,
    handleSessionEvent
  } = useSessionHandler();
  
  // New hook that handles event distribution logic
  const { distributeEvent } = useChatEventDistributor();
  
  // Create a combined message handler that delegates to specific handlers
  const combinedMessageHandler = useCallback((event: any) => {
    // Distribute the event to appropriate handlers
    distributeEvent(event);
    
    // Process voice activity and transcript events
    handleVoiceEvent(event);
    
    // Process session creation events
    handleSessionEvent(event);
  }, [distributeEvent, handleVoiceEvent, handleSessionEvent]);

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
