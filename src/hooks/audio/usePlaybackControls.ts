
import { useState, useCallback, RefObject, useEffect } from 'react';
import { toast } from 'sonner';

interface UsePlaybackControlsProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTime: number;
  createAudio: () => HTMLAudioElement | null;
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
    if (!audioRef.current) {
      console.warn("No audio element available for playback");
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Error playing audio:", err);
        
        // If playback fails, try to recreate the audio element
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          console.log(`Recreating audio element, attempt ${retryCountRef.current}/${maxRetries}`);
          
          const audio = createAudio();
          if (audio) {
            audio.currentTime = currentTime;
            audio.play().catch(e => {
              console.error("Error playing after recreation:", e);
              setIsPlaying(false);
            });
          }
        } else {
          toast.error("Failed to play audio. Please try again later.");
          setIsPlaying(false);
        }
      });
      setIsPlaying(true);
    }
  }, [isPlaying, audioRef, currentTime, createAudio]);

  // Event listeners for play/pause state sync
  useEffect(() => {
    if (!audioRef.current) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
      }
    };
  }, [audioRef]);

  return {
    isPlaying,
    setIsPlaying,
    togglePlayPause,
    setupPlaybackStateListeners: () => {} // Kept for API compatibility
  };
}
