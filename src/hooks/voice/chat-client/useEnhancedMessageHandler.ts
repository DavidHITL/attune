
import { useCallback } from 'react';

/**
 * Hook for enhancing message handling with session awareness
 */
export const useEnhancedMessageHandler = (
  combinedMessageHandler: (event: any) => void,
  onSessionCreated: () => void,
  webSocketRef: React.MutableRefObject<WebSocket | null>,
  sendSessionUpdate: (websocket: WebSocket) => void
) => {
  // Enhanced message handler to detect session.created events
  const enhancedMessageHandler = useCallback((event: any) => {
    // Process the event with the standard handler first
    combinedMessageHandler(event);
    
    // Check for session.created to send the session.update with audio transcription configuration
    if (event.type === 'session.created') {
      console.log('[ChatClient] Session created event detected, will send session.update');
      onSessionCreated();
      
      // Send the session.update event
      if (webSocketRef.current?.readyState === WebSocket.OPEN) {
        sendSessionUpdate(webSocketRef.current);
      }
    }
  }, [combinedMessageHandler, onSessionCreated, webSocketRef, sendSessionUpdate]);

  return {
    enhancedMessageHandler
  };
};
