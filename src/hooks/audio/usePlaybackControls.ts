
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
  const playAttemptInProgressRef = { current: false };
  
  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    // Prevent multiple simultaneous play attempts
    if (playAttemptInProgressRef.current) {
      console.log("Play attempt already in progress, ignoring duplicate request");
      return;
    }
    
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
      // Important: Log the play attempt to help with debugging
      console.log("Attempting to play audio...");
      playAttemptInProgressRef.current = true;
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log("Audio playback started successfully");
          setIsPlaying(true);
          playAttemptInProgressRef.current = false;
        }).catch(err => {
          console.error("Error playing audio:", err);
          playAttemptInProgressRef.current = false;
          
          // If playback fails, try to recreate the audio element - but only once
          if (retryCountRef.current < 1) {
            retryCountRef.current += 1;
            console.log(`Recreating audio element, attempt ${retryCountRef.current}/${maxRetries}`);
            
            // Don't try to create a new audio immediately, just notify the user
            toast.error("Failed to play audio. Please try again.");
            setIsPlaying(false);
          } else {
            toast.error("Failed to play audio. Please try again later.");
            setIsPlaying(false);
          }
        });
      } else {
        // For older browsers where play() doesn't return a promise
        setIsPlaying(true);
        playAttemptInProgressRef.current = false;
      }
    }
  }, [isPlaying, audioRef, currentTime, createAudio]);

  // Event listeners for play/pause state sync
  useEffect(() => {
    if (!audioRef.current) return;

    const handlePlay = () => {
      console.log("Play event triggered");
      setIsPlaying(true);
      playAttemptInProgressRef.current = false;
    };
    
    const handlePause = () => {
      console.log("Pause event triggered");
      setIsPlaying(false);
      playAttemptInProgressRef.current = false;
    };
    
    const handleEnded = () => {
      console.log("Audio ended");
      setIsPlaying(false);
      playAttemptInProgressRef.current = false;
    };
    
    const handleError = (e: Event) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
      playAttemptInProgressRef.current = false;
      
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
