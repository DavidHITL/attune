
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
    console.log("Creating audio element with URL:", audioUrl);
    
    // Validate URL before proceeding - stricter validation
    if (!audioUrl || typeof audioUrl !== 'string' || audioUrl.trim() === '') {
      console.error("Invalid audio URL provided:", audioUrl);
      if (onError) onError(new Error("Invalid audio URL provided"));
      return null;
    }
    
    try {
      // Test if URL is properly formatted
      new URL(audioUrl);
    } catch (e) {
      console.error("Malformed URL:", audioUrl, e);
      if (onError) onError(new Error("Malformed audio URL"));
      return null;
    }
    
    if (audioRef.current) {
      // Clean up existing audio element first
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load(); // Force clean up
      
      // Remove all event listeners
      audioRef.current.removeEventListener('loadedmetadata', () => {});
      audioRef.current.removeEventListener('timeupdate', () => {});
      audioRef.current.removeEventListener('ended', () => {});
      audioRef.current.removeEventListener('play', () => {});
      audioRef.current.removeEventListener('pause', () => {});
      audioRef.current.removeEventListener('error', () => {});
      audioRef.current = null;
    }
    
    try {
      // Create new audio element with proper error handling
      const audio = new Audio();
      
      // Add cache-busting parameter to prevent 304 responses
      const cacheBuster = Date.now();
      const urlWithCache = audioUrl.includes('?') 
        ? `${audioUrl}&_cb=${cacheBuster}` 
        : `${audioUrl}?_cb=${cacheBuster}`;
      
      // Set up event listeners before setting src
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
      
      // Handle errors with detailed logging
      audio.addEventListener('error', (e) => {
        const errorCode = audio.error ? audio.error.code : 'unknown';
        const errorMessage = audio.error ? audio.error.message : "Unknown audio error";
        console.error(`Audio error: code=${errorCode}, message=${errorMessage}`, e);
        
        // Attempt to retry loading the audio
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          console.log(`Retry attempt ${retryCountRef.current}/${maxRetries}`);
          
          // Create a new audio element with delay for retry
          setTimeout(() => {
            try {
              const retryAudio = new Audio();
              
              // Set up the same event listeners
              setupRetryEventListeners(retryAudio);
              
              // New cache-buster for retry
              const retryCacheBuster = Date.now();
              const retryUrl = audioUrl.includes('?') 
                ? `${audioUrl}&_cb=${retryCacheBuster}&retry=${retryCountRef.current}` 
                : `${audioUrl}?_cb=${retryCacheBuster}&retry=${retryCountRef.current}`;
              
              // First set preload, ensure it's auto
              retryAudio.preload = "auto";
              
              // Then set source explicitly and load
              retryAudio.src = retryUrl;
              
              // Force loading
              retryAudio.load();
              
              // Replace the ref
              audioRef.current = retryAudio;
            } catch (retryError) {
              console.error("Error during retry creation:", retryError);
              if (retryCountRef.current >= maxRetries && onError) {
                onError(new Error(`Failed to load audio after ${maxRetries} attempts`));
              }
            }
          }, 1000);
        } else {
          console.error("Max retries reached for audio loading");
          if (onError) {
            onError(new Error(`Failed to load audio after ${maxRetries} attempts`));
          }
        }
      });
      
      // Helper function to set up retry event listeners
      function setupRetryEventListeners(audioElement: HTMLAudioElement) {
        audioElement.addEventListener('loadedmetadata', () => {
          console.log("Audio metadata loaded on retry, duration:", audioElement.duration);
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
          console.error("Audio retry error:", e, audioElement.error);
          // Don't trigger recursive retries
        });
      }
      
      // Set preload before src
      audio.preload = "auto";
      
      // Now set source and force load
      audio.src = urlWithCache;
      audio.load(); // Explicitly call load
      
      audioRef.current = audio;
      return audio;
    } catch (err) {
      console.error("Error creating audio element:", err);
      if (onError) onError(new Error("Failed to create audio element"));
      return null;
    }
  }, [audioUrl, initialProgress, onComplete, setLoaded, onError]);
  
  // Set up audio element
  useEffect(() => {
    // Validate URL thoroughly before proceeding
    if (!audioUrl || typeof audioUrl !== 'string' || audioUrl.trim() === '') {
      console.error("Invalid audio URL provided:", audioUrl);
      if (onError) onError(new Error("Invalid audio URL provided"));
      return () => {};
    }
    
    try {
      new URL(audioUrl); // Test URL validity
    } catch (e) {
      console.error("Malformed URL:", audioUrl, e);
      if (onError) onError(new Error("Malformed audio URL"));
      return () => {};
    }
    
    const audio = createAudio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load(); // Force clean up
        
        // Clean up event listeners
        audioRef.current.removeEventListener('loadedmetadata', () => {});
        audioRef.current.removeEventListener('timeupdate', () => {});
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.removeEventListener('play', () => {});
        audioRef.current.removeEventListener('pause', () => {});
        audioRef.current.removeEventListener('error', () => {});
        audioRef.current = null;
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
