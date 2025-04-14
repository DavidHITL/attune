
import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook for handling call start/end functionality
 */
export const useCallControls = (
  startConversation: () => Promise<void>,
  endConversation: () => void
) => {
  const handleStartCall = useCallback(async () => {
    console.log("Start call button clicked");
    try {
      await startConversation();
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start call. Please try again.");
    }
  }, [startConversation]);

  const handleEndCall = useCallback(() => {
    console.log("End call button clicked");
    endConversation();
  }, [endConversation]);

  return {
    handleStartCall,
    handleEndCall
  };
};
