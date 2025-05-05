import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useMessageEventHandler } from './useMessageEventHandler';
import { useWebSocketConnection } from './chat-client/useWebSocketConnection';
import { useSessionManagement } from './chat-client/useSessionManagement';
import { useAudioControls } from './chat-client/useAudioControls';
import { createEnhancedMessageHandler } from './chat-client/useEnhancedMessageHandler';

/**
 * Custom hook for managing the chat client and its connection
 */
export const useChatClient = () => {
  // Create a ref for the WebSocket to avoid circular dependencies
  const chatClientRef = useRef<WebSocket | null>(null);
  
  const { 
    voiceActivityState,
    combinedMessageHandler
  } = useMessageEventHandler();
  
  const {
    conversationId,
    setConversationId,
    hasReceivedSessionCreated,
    handleSessionCreated,
    sendSessionCreate,
    sendSessionUpdate,
    resetSession
  } = useSessionManagement();
  
  const {
    isMuted,
    toggleMute
  } = useAudioControls();

  // Keep track of whether we've sent a session update
  const sessionUpdateSentRef = useRef<boolean>(false);
  
  // Create a base message handler
  const baseMessageHandler = useCallback((event: any) => {
    // Process the event using our combined handler
    combinedMessageHandler(event);
    
    // Special handling for session.created event
    if (event.type === 'session.created') {
      console.log("[ChatClient] Received session.created event");
      handleSessionCreated();
      
      // Send session.update if we haven't already
      if (chatClientRef.current && !sessionUpdateSentRef.current) {
        console.log("[ChatClient] Sending session.update after session.created");
        sendSessionUpdate(chatClientRef.current);
        sessionUpdateSentRef.current = true;
      }
    }
  }, [combinedMessageHandler, handleSessionCreated, sendSessionUpdate]);
  
  // Use the WebSocket connection hook with our base handler
  const {
    isConnected,
    status,
    connectionError,
    websocketRef,
    startConnection,
    closeConnection
  } = useWebSocketConnection(baseMessageHandler);
  
  // Update the chatClientRef whenever websocketRef changes
  if (chatClientRef.current !== websocketRef.current) {
    chatClientRef.current = websocketRef.current;
  }
  
  // Function to start the WebSocket connection
  const startConversation = useCallback(async () => {
    if (isConnected) {
      console.log("[ChatClient] Already connected");
      return;
    }
    
    try {
      // Reset the session update tracking
      sessionUpdateSentRef.current = false;
      
      // Start the WebSocket connection
      const sessionId = await startConnection();
      
      if (sessionId && websocketRef.current) {
        // Send session.create event after connection is open
        sendSessionCreate(websocketRef.current, sessionId);
      }
    } catch (error) {
      console.error('[ChatClient] Failed to start conversation:', error);
      
      // Show toast notification
      toast.error("Failed to start conversation", {
        description: "Please try again.",
        duration: 3000
      });
    }
  }, [isConnected, startConnection, websocketRef, sendSessionCreate]);
  
  // Function to end the WebSocket connection
  const endConversation = useCallback(() => {
    closeConnection();
    resetSession();
    
    // Reset our session update tracking
    sessionUpdateSentRef.current = false;
    
    // Show toast notification
    toast.success("Call ended", {
      description: "You have disconnected from the voice server.",
      duration: 2000
    });
  }, [closeConnection, resetSession]);
  
  return {
    status,
    isConnected,
    voiceActivityState,
    isMuted,
    connectionError,
    hasReceivedSessionCreated,
    startConversation,
    endConversation,
    toggleMute,
    chatClientRef
  };
};
