
import { useCallback } from 'react';
import { useVoiceEventHandler } from '@/hooks/voice/useVoiceEventHandler';
import { useSessionHandler } from '@/hooks/voice/useSessionHandler';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

/**
 * Hook for UI state updates only - no message processing
 * NOTE: All primary event processing happens in EventDispatcher
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
  
  // Create a UI state handler that only manages UI state
  const combinedMessageHandler = useCallback((event: any) => {
    const eventCategory = EventTypeRegistry.getEventCategoryName(event.type);
    console.log(`[useMessageEventHandler] UI state updates only for: ${event.type} (${eventCategory})`);
    
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
