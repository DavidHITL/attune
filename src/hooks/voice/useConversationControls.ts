
import { useCallback } from 'react';

type ChatClientRef = React.MutableRefObject<any>;

/**
 * Hook for managing conversation controls
 */
export const useConversationControls = (
  chatClientRef: ChatClientRef,
  isConnected: boolean,
  startConversation: () => Promise<void>
) => {
  // Function to handle user-initiated conversation start
  const handleStartConversation = useCallback(() => {
    console.log("Handle start conversation called, isConnected:", isConnected);
    
    if (!isConnected) {
      console.log("User initiated conversation start");
      // Call startConversation from useConnectionManager
      startConversation();
    } else {
      console.log("Already connected, ignoring start request");
    }
  }, [isConnected, startConversation]);

  // Clean up effect for component unmount
  const cleanupChatClient = useCallback(() => {
    if (chatClientRef.current) {
      console.log("Component unmounting - disconnecting chat client");
      chatClientRef.current.disconnect();
    }
  }, [chatClientRef]);

  return {
    handleStartConversation,
    cleanupChatClient
  };
};
