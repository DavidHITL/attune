
import { useCallback } from 'react';
import { useVoiceEventHandler } from '@/hooks/voice/useVoiceEventHandler';
import { useSessionHandler } from '@/hooks/voice/useSessionHandler';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

/**
 * Hook for combining different message event handlers
 * NOTE: This is now a secondary layer - primary event routing happens in EventDispatcher
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
    console.log(`[useMessageEventHandler] Secondary processing of event: ${event.type}`);
    console.log(`[useMessageEventHandler] EventTypeRegistry role: ${EventTypeRegistry.getRoleForEvent(event.type) || 'none'}`);
    
    // Handle UI state updates only, not message saving
    handleVoiceEvent(event);
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
