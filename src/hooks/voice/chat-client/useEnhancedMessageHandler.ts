
import { useCallback } from 'react';

/**
 * Hook for creating an enhanced message handler that processes session events
 */
export const useEnhancedMessageHandler = (
  messageHandler: (event: any) => void,
  handleSessionCreated: () => void,
  websocketRef: React.RefObject<WebSocket>,
  sendSessionUpdate: (websocket: WebSocket) => void
) => {
  /**
   * Enhanced message handler that tracks session events
   */
  const enhancedMessageHandler = useCallback((event: any) => {
    // First, let the original message handler process the event
    messageHandler(event);
    
    // Special handling for session events
    if (event.type === 'session.created') {
      console.log('[EnhancedMessageHandler] Detected session.created event');
      
      // Notify session manager that session was created
      handleSessionCreated();
      
      // Now send the session.update to configure the speech-to-text model
      if (websocketRef.current) {
        console.log('[EnhancedMessageHandler] Sending session.update after session.created');
        sendSessionUpdate(websocketRef.current);
      }
    }
  }, [messageHandler, handleSessionCreated, websocketRef, sendSessionUpdate]);

  return {
    enhancedMessageHandler
  };
};
