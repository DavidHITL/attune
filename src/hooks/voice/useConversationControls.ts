
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';

type ChatClientRef = React.MutableRefObject<any>;

/**
 * Hook for managing conversation controls
 */
export const useConversationControls = (
  chatClientRef: ChatClientRef,
  isConnected: boolean,
  startConversation: () => Promise<void>
) => {
  // Prevent auto-connecting - only connect when user explicitly requests it
  const handleStartConversation = useCallback(() => {
    if (!isConnected) {
      console.log("User initiated conversation start");
      startConversation();
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
