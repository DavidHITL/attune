
import { toast } from 'sonner';

/**
 * Interface for events that can be processed by the message handler
 */
interface MessageEvent {
  type: string;
  [key: string]: any;
}

/**
 * Interface for creating an enhanced message handler
 */
interface CreateEnhancedMessageHandlerOptions {
  messageHandler: (event: MessageEvent) => void;
  handleSessionCreated: () => void;
  websocketRef: React.RefObject<WebSocket>;
  sendSessionUpdate: (websocket: WebSocket) => void;
}

/**
 * Factory function to create an enhanced message handler with proper state tracking
 */
export const createEnhancedMessageHandler = (
  options: CreateEnhancedMessageHandlerOptions
) => {
  const { messageHandler, handleSessionCreated, websocketRef, sendSessionUpdate } = options;
  
  // Use a local variable for session update tracking instead of React's useRef
  let sessionUpdateSent = false;
  
  /**
   * Reset session update tracking when needed
   */
  const resetSessionUpdateTracking = () => {
    sessionUpdateSent = false;
    console.log('[EnhancedMessageHandler] Session update tracking reset');
  };
  
  /**
   * Enhanced message handler that tracks session events
   * with improved error handling and type checking
   */
  const enhancedMessageHandler = (event: MessageEvent) => {
    try {
      // Validate event before processing
      if (!event || typeof event !== 'object') {
        console.error('[EnhancedMessageHandler] Invalid event received:', event);
        return;
      }
      
      // First, let the original message handler process the event
      messageHandler(event);
      
      // Special handling for session events
      if (event.type === 'session.created') {
        console.log('[EnhancedMessageHandler] Detected session.created event');
        
        try {
          // Notify session manager that session was created
          handleSessionCreated();
          
          // Now send the session.update to configure the speech-to-text model
          // but only if we haven't already sent it for this session
          if (websocketRef.current && !sessionUpdateSent) {
            console.log('[EnhancedMessageHandler] Sending session.update after session.created');
            sendSessionUpdate(websocketRef.current);
            sessionUpdateSent = true;
          } else if (!websocketRef.current) {
            console.warn('[EnhancedMessageHandler] WebSocket ref is null, cannot send session.update');
          } else if (sessionUpdateSent) {
            console.log('[EnhancedMessageHandler] Session update already sent, skipping duplicate');
          }
        } catch (sessionError) {
          console.error('[EnhancedMessageHandler] Error handling session creation:', sessionError);
          toast.error('Error configuring session', {
            description: 'Please try reconnecting'
          });
        }
      }
    } catch (error) {
      // Catch and log any errors in the message handler to prevent bubbling
      console.error('[EnhancedMessageHandler] Error processing message event:', error);
      toast.error('Error processing message', {
        description: 'An error occurred while processing a message event'
      });
    }
  };

  return {
    enhancedMessageHandler,
    resetSessionUpdateTracking
  };
};

/**
 * Hook for using the enhanced message handler within React components
 * This wrapper ensures proper React integration
 */
export const useEnhancedMessageHandler = (
  options: CreateEnhancedMessageHandlerOptions
) => {
  return createEnhancedMessageHandler(options);
};
