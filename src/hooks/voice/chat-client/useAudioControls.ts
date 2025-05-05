
import { useState, useCallback } from 'react';

/**
 * Hook for managing audio controls
 */
export const useAudioControls = () => {
  const [isMuted, setIsMuted] = useState(false);
  
  // Function to toggle mute state
  const toggleMute = useCallback(() => {
    setIsMuted(prevIsMuted => !prevIsMuted);
  }, []);

  return {
    isMuted,
    setIsMuted,
    toggleMute
  };
};
