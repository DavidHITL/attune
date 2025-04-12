
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAudioElementProps {
  audioUrl: string;
  initialProgress: number;
  onComplete: () => void;
  setLoaded: (loaded: boolean) => void;
}

export function useAudioElement({
  audioUrl,
  initialProgress,
  onComplete,
  setLoaded
}: UseAudioElementProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialProgress || 0);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Create audio element with error handling
  const createAudio = useCallback(() => {
    if (audioRef.current) {
      // Clean up existing audio element first
      audioRef.current.pause();
      audioRef.current.src = '';
      
      // Remove all event listeners
      audioRef.current.removeEventListener('loadedmetadata', () => {});
      audioRef.current.removeEventListener('timeupdate', () => {});
      audioRef.current.removeEventListener('ended', () => {});
      audioRef.current.removeEventListener('play', () => {});
      audioRef.current.removeEventListener('pause', () => {});
      audioRef.current.removeEventListener('error', () => {});
    }
    
    console.log("Creating new audio element with URL:", audioUrl);
    
    // Create fresh audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // Set up event listeners
    audio.addEventListener('loadedmetadata', () => {
      console.log("Audio metadata loaded, duration:", audio.duration);
      setDuration(audio.duration);
      setLoaded(true);
      retryCountRef.current = 0; // Reset retry counter on successful load
      
      // Set initial position if provided
      if (initialProgress && initialProgress > 0) {
        audio.currentTime = initialProgress;
        setCurrentTime(initialProgress);
      }
    });
    
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    
    audio.addEventListener('ended', () => {
      onComplete();
    });
    
    // Handle errors
    audio.addEventListener('error', (e) => {
      console.error("Audio error:", e, audio.error);
      
      // Attempt to retry loading the audio
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`Retry attempt ${retryCountRef.current}/${maxRetries}`);
        
        // Small delay before retrying
        setTimeout(() => {
          createAudio();
        }, 1000);
      } else {
        toast.error("Failed to load audio. Please try again later.");
        console.error("Max retries reached for audio loading");
      }
    });
    
    // Add cache-busting parameter to prevent 304 responses
    audio.src = audioUrl.includes('?') 
      ? `${audioUrl}&_cb=${Date.now()}` 
      : `${audioUrl}?_cb=${Date.now()}`;
    
    // Preload audio
    audio.preload = "auto";
    
    // Return the audio element
    return audio;
  }, [audioUrl, initialProgress, onComplete, setLoaded]);
  
  // Set up audio element
  useEffect(() => {
    const audio = createAudio();
    
    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', () => {});
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('ended', () => {});
      audio.removeEventListener('play', () => {});
      audio.removeEventListener('pause', () => {});
      audio.removeEventListener('error', () => {});
    };
  }, [audioUrl, initialProgress, createAudio]);

  return {
    audioRef,
    duration,
    currentTime,
    setCurrentTime,
    createAudio
  };
}
