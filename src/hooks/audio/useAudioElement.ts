
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAudioElementProps {
  audioUrl: string;
  initialProgress: number;
  onComplete: () => void;
  setLoaded: (loaded: boolean) => void;
  onError?: (error: Error) => void;
}

export function useAudioElement({
  audioUrl,
  initialProgress,
  onComplete,
  setLoaded,
  onError
}: UseAudioElementProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialProgress || 0);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Create audio element with error handling
  const createAudio = useCallback(() => {
    // Validate URL before proceeding
    if (!audioUrl || typeof audioUrl !== 'string' || audioUrl.trim() === '') {
      console.error("Invalid audio URL provided:", audioUrl);
      if (onError) onError(new Error("Invalid audio URL provided"));
      return null;
    }
    
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
    const audio = new Audio();
    audioRef.current = audio;
    
    // Add cache-busting parameter to prevent 304 responses
    const validUrl = audioUrl.trim();
    const cacheBuster = Date.now();
    const urlWithCache = validUrl.includes('?') 
      ? `${validUrl}&_cb=${cacheBuster}` 
      : `${validUrl}?_cb=${cacheBuster}`;
    
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
      
      const errorMessage = audio.error ? audio.error.message : "Unknown audio error";
      if (onError) onError(new Error(errorMessage));
      
      // Attempt to retry loading the audio
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`Retry attempt ${retryCountRef.current}/${maxRetries}`);
        
        // Small delay before retrying
        setTimeout(() => {
          // Make sure we still have a valid URL
          if (!validUrl || validUrl === '') {
            if (onError) onError(new Error("Invalid audio URL for retry"));
            return;
          }
          
          const newAudio = new Audio();
          audioRef.current = newAudio;
          
          // Set up the same event listeners on the new audio element
          setupEventListeners(newAudio);
          
          // New cache-buster for retry
          const retryCacheBuster = Date.now();
          const retryUrl = validUrl.includes('?') 
            ? `${validUrl}&_cb=${retryCacheBuster}` 
            : `${validUrl}?_cb=${retryCacheBuster}`;
          
          newAudio.preload = "auto";
          newAudio.src = retryUrl;
          newAudio.load(); // Explicitly call load
        }, 1000);
      } else {
        toast.error("Failed to load audio. Please try again later.");
        console.error("Max retries reached for audio loading");
      }
    });
    
    // Helper function to set up event listeners
    function setupEventListeners(audioElement: HTMLAudioElement) {
      audioElement.addEventListener('loadedmetadata', () => {
        console.log("Audio metadata loaded, duration:", audioElement.duration);
        setDuration(audioElement.duration);
        setLoaded(true);
        
        // Set initial position if provided
        if (initialProgress && initialProgress > 0) {
          audioElement.currentTime = initialProgress;
          setCurrentTime(initialProgress);
        }
      });
      
      audioElement.addEventListener('timeupdate', () => {
        setCurrentTime(audioElement.currentTime);
      });
      
      audioElement.addEventListener('ended', () => {
        onComplete();
      });
      
      audioElement.addEventListener('error', (e) => {
        console.error("Audio retry error:", e);
      });
    }
    
    // First set preload, then set src
    audio.preload = "auto";
    
    // Only set src if we have a valid URL
    if (validUrl && validUrl !== '') {
      audio.src = urlWithCache;
      // Explicitly call load to start fetching the audio
      audio.load();
    } else {
      console.error("Empty URL provided for audio element");
      if (onError) onError(new Error("Empty URL provided for audio element"));
      return null;
    }
    
    // Return the audio element
    return audio;
  }, [audioUrl, initialProgress, onComplete, setLoaded, onError]);
  
  // Set up audio element
  useEffect(() => {
    if (!audioUrl || typeof audioUrl !== 'string' || audioUrl.trim() === '') {
      console.error("Invalid audio URL provided:", audioUrl);
      if (onError) onError(new Error("Invalid audio URL provided"));
      return () => {};
    }
    
    const audio = createAudio();
    
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
        // Clean up event listeners
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('ended', () => {});
        audio.removeEventListener('play', () => {});
        audio.removeEventListener('pause', () => {});
        audio.removeEventListener('error', () => {});
      }
    };
  }, [audioUrl, initialProgress, createAudio, onError]);

  return {
    audioRef,
    duration,
    currentTime,
    setCurrentTime,
    createAudio
  };
}
