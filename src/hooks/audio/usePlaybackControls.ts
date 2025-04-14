
import { useState, useCallback, RefObject, useEffect, useRef } from 'react';
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
  const playAttemptInProgressRef = useRef(false);
  const lastPlayAttemptTimeRef = useRef(0);
  const DEBOUNCE_TIME = 1000; // 1 second debounce
  
  // Handle play/pause with strong debouncing
  const togglePlayPause = useCallback(() => {
    // Strong debounce - ignore rapid repeated calls
    const now = Date.now();
    if (now - lastPlayAttemptTimeRef.current < DEBOUNCE_TIME) {
      console.log("Ignoring rapid play attempt");
      return;
    }
    
    lastPlayAttemptTimeRef.current = now;
    
    // Prevent multiple simultaneous play attempts
    if (playAttemptInProgressRef.current) {
      console.log("Play attempt already in progress, ignoring duplicate request");
      return;
    }
    
    if (!audioRef.current) {
      console.warn("No audio element available for playback");
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
          setIsPlaying(false);
          toast.error("Failed to play audio. Please try again.");
        });
      } else {
        // For older browsers where play() doesn't return a promise
        setIsPlaying(true);
        playAttemptInProgressRef.current = false;
      }
    }
  }, [audioRef, isPlaying]);

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
  }, [audioRef]);

  return {
    isPlaying,
    setIsPlaying,
    togglePlayPause,
    setupPlaybackStateListeners: () => {} // Kept for API compatibility
  };
}
