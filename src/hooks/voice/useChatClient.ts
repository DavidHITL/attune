
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useMessageEventHandler } from './useMessageEventHandler';
import { useWebSocketConnection } from './chat-client/useWebSocketConnection';
import { useSessionManagement } from './chat-client/useSessionManagement';
import { useAudioControls } from './chat-client/useAudioControls';
import { useEnhancedMessageHandler } from './chat-client/useEnhancedMessageHandler';

/**
 * Custom hook for managing the chat client and its connection
 */
export const useChatClient = () => {
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
  
  // Get enhanced message handler that's aware of sessions
  const getEnhancedHandler = useCallback((websocketRef) => {
    const { enhancedMessageHandler } = useEnhancedMessageHandler(
      combinedMessageHandler, 
      handleSessionCreated, 
      websocketRef,
      sendSessionUpdate
    );
    return enhancedMessageHandler;
  }, [combinedMessageHandler, handleSessionCreated, sendSessionUpdate]);
  
  // Use the WebSocket connection hook
  const {
    isConnected,
    status,
    connectionError,
    websocketRef: chatClientRef,
    startConnection,
    closeConnection
  } = useWebSocketConnection(
    // We need a way to set up the handler with access to the websocketRef,
    // but we can't use enhancedMessageHandler directly because it would
    // create a circular dependency. So we use this approach:
    event => getEnhancedHandler(chatClientRef)(event)
  );
  
  // Function to start the WebSocket connection
  const startConversation = useCallback(async () => {
    if (isConnected) {
      console.log("Already connected");
      return;
    }
    
    try {
      // Start the WebSocket connection
      const sessionId = await startConnection();
      
      if (sessionId && chatClientRef.current) {
        // Send session.create event after connection is open
        sendSessionCreate(chatClientRef.current, sessionId);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      
      // Show toast notification
      toast.error("Failed to start conversation", {
        description: "Please try again.",
        duration: 3000
      });
    }
  }, [isConnected, startConnection, chatClientRef, sendSessionCreate]);
  
  // Function to end the WebSocket connection
  const endConversation = useCallback(() => {
    closeConnection();
    resetSession();
    
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
