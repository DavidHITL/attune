
import { useState, useCallback, RefObject } from 'react';
import { toast } from 'sonner';

interface UsePlaybackControlsProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTime: number;
  createAudio: () => HTMLAudioElement;
}

export function usePlaybackControls({
  audioRef,
  currentTime,
  createAudio
}: UsePlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const retryCountRef = { current: 0 };
  const maxRetries = 3;
  
  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error("Error playing audio:", err);
        
        // If playback fails, try to recreate the audio element
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          console.log(`Recreating audio element, attempt ${retryCountRef.current}/${maxRetries}`);
          
          const audio = createAudio();
          audio.currentTime = currentTime;
          audio.play().catch(e => console.error("Error playing after recreation:", e));
        } else {
          toast.error("Failed to play audio. Please try again later.");
        }
      });
    }
    
    // Let the event listeners handle the state update
    // This ensures the UI state matches the actual audio state
  }, [isPlaying, audioRef, currentTime, createAudio]);

  // Event listeners for play/pause state sync
  const setupPlaybackStateListeners = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.addEventListener('play', () => setIsPlaying(true));
    audioRef.current.addEventListener('pause', () => setIsPlaying(false));
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', () => {});
        audioRef.current.removeEventListener('pause', () => {});
      }
    };
  }, [audioRef]);

  return {
    isPlaying,
    setIsPlaying,
    togglePlayPause,
    setupPlaybackStateListeners
  };
}
