
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
      
      // Try to recreate the audio element as a recovery measure
      const audio = createAudio();
      if (!audio) {
        toast.error("Unable to play audio. Audio source not available.");
        return;
      }
      
      // If we got here, we have a new audio element
      console.log("Created new audio element for playback");
    }
    
    if (!audioRef.current) {
      console.error("Failed to create audio element");
      toast.error("Unable to play audio. Please try again later.");
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Error playing audio:", err);
          
          // If playback fails, try to recreate the audio element
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current += 1;
            console.log(`Recreating audio element, attempt ${retryCountRef.current}/${maxRetries}`);
            
            const audio = createAudio();
            if (audio) {
              // Make sure to set the current time before playing
              audio.currentTime = currentTime;
              audio.play().catch(e => {
                console.error("Error playing after recreation:", e);
                setIsPlaying(false);
                
                if (e.name === 'NotSupportedError') {
                  toast.error("This audio format is not supported by your browser.");
                } else if (e.name === 'NotAllowedError') {
                  toast.error("Playback was blocked. Please interact with the page first.");
                } else {
                  toast.error("Failed to play audio. Please try again later.");
                }
              });
            }
          } else {
            toast.error("Failed to play audio. Please try again later.");
            setIsPlaying(false);
          }
        });
      }
      setIsPlaying(true);
    }
  }, [isPlaying, audioRef, currentTime, createAudio]);

  // Event listeners for play/pause state sync
  useEffect(() => {
    if (!audioRef.current) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
      
      // Only show toast for user-initiated actions to avoid spam
      if (isPlaying) {
        toast.error("Audio playback error. Please try again.");
      }
    };
    
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('error', handleError);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleError);
      }
    };
  }, [audioRef, isPlaying]);

  return {
    isPlaying,
    setIsPlaying,
    togglePlayPause,
    setupPlaybackStateListeners: () => {} // Kept for API compatibility
  };
}
