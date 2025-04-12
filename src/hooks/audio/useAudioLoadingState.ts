
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface UseAudioLoadingStateProps {
  loaded: boolean;
}

export function useAudioLoadingState({ loaded }: UseAudioLoadingStateProps) {
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Check if we've loaded after a timeout
  useEffect(() => {
    if (loaded) return;
    
    // After 5 seconds, check if audio has loaded
    const timeout = setTimeout(() => {
      if (!loaded) {
        // Increment load attempts
        setLoadAttempts(prev => {
          const newAttempt = prev + 1;
          
          // If we've tried 3 times, show an error toast
          if (newAttempt >= 3) {
            setLoadError("Audio is taking longer than expected to load. You may need to refresh the page.");
            toast.error("Audio failed to load properly. Try refreshing the page.");
          }
          
          return newAttempt;
        });
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [loaded]);

  return {
    loadAttempts,
    loadError,
    setLoadError
  };
}
