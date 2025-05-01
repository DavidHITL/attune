
import { useCallback } from 'react';
import { useVoiceEventHandler } from '@/hooks/voice/useVoiceEventHandler';
import { useSessionHandler } from '@/hooks/voice/useSessionHandler';

/**
 * Hook for combining different message event handlers
 * Now uses only the modern EventDispatcher system
 */
export const useMessageEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  // Use only our new event handling system - the voice event handler with EventDispatcher
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
    // Process voice activity and transcript events through the modern event handler
    handleVoiceEvent(event);
    
    // Process session creation events
    handleSessionEvent(event);

    // Log event processing for debugging (but limit frequency of logs)
    if (event.type && !event.type.includes('audio_buffer') && Math.random() < 0.1) {
      console.log(`[MessageEventHandler] Processed event: ${event.type}`);
    }
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
