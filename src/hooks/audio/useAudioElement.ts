
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
  
  // Create audio element with proper initialization sequence
  const createAudio = useCallback(() => {
    console.log("Creating audio element with URL:", audioUrl);
    
    // Validate URL before proceeding
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
    
    // Clean up existing audio element if it exists
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src'); // Use removeAttribute instead of setting empty string
      audioRef.current.load();
      
      // Remove all event listeners
      const element = audioRef.current;
      element.onloadedmetadata = null;
      element.ontimeupdate = null;
      element.onended = null;
      element.onplay = null;
      element.onpause = null;
      element.onerror = null;
      audioRef.current = null;
    }
    
    try {
      // Create new audio element with proper initialization sequence
      const audio = new Audio();
      
      // Set up event listeners before setting src
      audio.addEventListener('loadedmetadata', () => {
        console.log("Audio metadata loaded, duration:", audio.duration);
        setDuration(audio.duration);
        setLoaded(true);
        retryCountRef.current = 0; // Reset retry counter on successful load
        
        // Set initial position if provided (only after metadata is loaded)
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
          
          // Key fix: Use a setTimeout to ensure a complete reset before retry
          setTimeout(() => {
            audio.pause();
            
            // Generate a unique URL with cache-busting
            const retryCacheBuster = Date.now() + Math.random().toString(36).substring(2, 10);
            const retryUrl = audioUrl.includes('?') 
              ? `${audioUrl}&_cb=${retryCacheBuster}&retry=${retryCountRef.current}` 
              : `${audioUrl}?_cb=${retryCacheBuster}&retry=${retryCountRef.current}`;
            
            // Clear any previous errors
            audio.onerror = null;
            
            // Set preload to auto
            audio.preload = "auto";
            
            // Set crossOrigin to anonymous to handle CORS issues
            audio.crossOrigin = "anonymous";
            
            // Re-add the error handler
            audio.onerror = (e) => {
              console.error("Audio retry error:", e, audio.error);
              if (retryCountRef.current >= maxRetries && onError) {
                onError(new Error(`Failed to load audio after ${maxRetries} attempts`));
              }
            };
            
            // First remove any existing source
            audio.removeAttribute('src');
            audio.load();
            
            // Then set source explicitly after a brief delay
            setTimeout(() => {
              audio.src = retryUrl;
              audio.load(); // Force loading
            }, 100);
          }, 300);
        } else {
          console.error("Max retries reached for audio loading");
          if (onError) {
            onError(new Error(`Failed to load audio after ${maxRetries} attempts`));
          }
        }
      });
      
      // First set preload, ensure it's auto
      audio.preload = "auto";
      
      // Set crossOrigin to anonymous
      audio.crossOrigin = "anonymous";
      
      // Add a cache-busting parameter
      const cacheBuster = Date.now() + Math.random().toString(36).substring(2, 10);
      const urlWithCache = audioUrl.includes('?') 
        ? `${audioUrl}&_cb=${cacheBuster}` 
        : `${audioUrl}?_cb=${cacheBuster}`;
      
      // Critical: Set src in a setTimeout to ensure DOM is ready
      setTimeout(() => {
        audio.src = urlWithCache;
        audio.load(); // Explicitly call load
      }, 0);
      
      audioRef.current = audio;
      return audio;
    } catch (err) {
      console.error("Error creating audio element:", err);
      if (onError) onError(new Error("Failed to create audio element"));
      return null;
    }
  }, [audioUrl, initialProgress, onComplete, setLoaded, onError]);
  
  // Set up audio element with proper timing
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
    
    // Use setTimeout to ensure component is fully mounted before creating audio
    const timeoutId = setTimeout(() => {
      const audio = createAudio();
      if (!audio && onError) {
        onError(new Error("Failed to create audio element"));
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        
        // Clean up event listeners
        const element = audioRef.current;
        element.onloadedmetadata = null;
        element.ontimeupdate = null;
        element.onended = null;
        element.onplay = null;
        element.onpause = null;
        element.onerror = null;
        audioRef.current = null;
      }
    };
  }, [audioUrl, createAudio, onError]);

  return {
    audioRef,
    duration,
    currentTime,
    setCurrentTime,
    createAudio
  };
}
