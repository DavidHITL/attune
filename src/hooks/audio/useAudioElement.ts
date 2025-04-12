
import { useState, useRef, useEffect, useCallback } from 'react';
import { isValidAudioUrl, createCacheBustedUrl } from './utils/audioValidation';
import { setupAudioElement, cleanupAudioElement } from './utils/audioElementSetup';
import { handleAudioLoadError } from './utils/audioRetry';

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
    if (!isValidAudioUrl(audioUrl)) {
      if (onError) onError(new Error("Invalid audio URL provided"));
      return null;
    }
    
    // Clean up existing audio element if it exists
    if (audioRef.current) {
      cleanupAudioElement(audioRef.current);
      audioRef.current = null;
    }
    
    try {
      // Create new audio element with proper initialization sequence
      const audio = new Audio();
      
      // Set preload to auto before anything else
      audio.preload = "auto";
      
      // Set up the audio element with all required event handlers
      setupAudioElement(audio, {
        onMetadataLoaded: (audioDuration) => {
          console.log("Audio metadata loaded, duration:", audioDuration);
          setDuration(audioDuration);
          setLoaded(true);
          retryCountRef.current = 0; // Reset retry counter on successful load
          
          // Set initial position if provided (only after metadata is loaded)
          if (initialProgress > 0) {
            audio.currentTime = initialProgress;
            setCurrentTime(initialProgress);
          }
        },
        
        onTimeUpdate: (time) => {
          setCurrentTime(time);
        },
        
        onEnded: onComplete,
        
        onError: (e) => {
          const errorCode = audio.error ? audio.error.code : 'unknown';
          const errorMessage = audio.error ? audio.error.message : "Unknown audio error";
          console.error(`Audio error: code=${errorCode}, message=${errorMessage}`, e);
          
          handleAudioLoadError(audio, audioUrl, retryCountRef, {
            maxRetries,
            onMaxRetriesReached: onError
          });
        },
        
        initialPosition: initialProgress
      });
      
      // Add a cache-busting parameter
      const urlWithCache = createCacheBustedUrl(audioUrl);
      
      // Critical: Set src in a setTimeout to ensure DOM is ready
      setTimeout(() => {
        audio.src = urlWithCache;
        audio.load(); // Explicitly call load
        
        // Log that we're setting the source
        console.log("Setting audio source to:", urlWithCache);
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
    if (!isValidAudioUrl(audioUrl)) {
      if (onError) onError(new Error("Invalid audio URL provided"));
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
        cleanupAudioElement(audioRef.current);
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
