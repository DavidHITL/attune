
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Interface for events that can be processed by the message handler
 */
interface MessageEvent {
  type: string;
  [key: string]: any;
}

/**
 * Interface for session-related events
 */
interface SessionEvent extends MessageEvent {
  type: 'session.created' | 'session.update' | 'session.disconnected';
  session?: {
    id: string;
    [key: string]: any;
  };
}

/**
 * Props for the enhanced message handler hook
 */
interface EnhancedMessageHandlerProps {
  messageHandler: (event: MessageEvent) => void;
  handleSessionCreated: () => void;
  websocketRef: React.RefObject<WebSocket>;
  sendSessionUpdate: (websocket: WebSocket) => void;
}

/**
 * Hook for creating an enhanced message handler that processes session events
 * with improved typing and error handling
 */
export const useEnhancedMessageHandler = ({
  messageHandler,
  handleSessionCreated,
  websocketRef,
  sendSessionUpdate
}: EnhancedMessageHandlerProps) => {
  // Track if session update has been sent to avoid duplicate updates
  const sessionUpdateSentRef = useRef<boolean>(false);
  
  /**
   * Reset session update tracking when needed
   */
  const resetSessionUpdateTracking = useCallback(() => {
    sessionUpdateSentRef.current = false;
  }, []);
  
  /**
   * Enhanced message handler that tracks session events
   * with improved error handling and type checking
   */
  const enhancedMessageHandler = useCallback((event: MessageEvent) => {
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
          if (websocketRef.current && !sessionUpdateSentRef.current) {
            console.log('[EnhancedMessageHandler] Sending session.update after session.created');
            sendSessionUpdate(websocketRef.current);
            sessionUpdateSentRef.current = true;
          } else if (!websocketRef.current) {
            console.warn('[EnhancedMessageHandler] WebSocket ref is null, cannot send session.update');
          } else if (sessionUpdateSentRef.current) {
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
  }, [messageHandler, handleSessionCreated, websocketRef, sendSessionUpdate]);

  return {
    enhancedMessageHandler,
    resetSessionUpdateTracking
  };
};
