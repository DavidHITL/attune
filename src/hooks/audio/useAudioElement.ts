
import { useState, useRef, useEffect, useCallback } from 'react';
import { isValidAudioUrl, createCacheBustedUrl } from './utils/audioValidation';
import { setupAudioElement, cleanupAudioElement } from './utils/audioElementSetup';
import { handleAudioLoadError } from './utils/audioRetry';
import { getAudioObjectUrl } from './utils/audioCache';

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
  const objectUrlRef = useRef<string | null>(null);
  // Critical flag to prevent recursive creation
  const audioCreationInProgressRef = useRef(false);
  // Add a creation attempt counter to prevent infinite loops
  const creationAttemptsRef = useRef(0);
  const MAX_CREATION_ATTEMPTS = 2;
  
  // Create audio element with proper initialization sequence
  const createAudio = useCallback(() => {
    // Strict prevention of recursive audio creation
    if (audioCreationInProgressRef.current) {
      console.log("Audio creation already in progress, skipping duplicate creation");
      return audioRef.current;
    }
    
    // Hard limit on number of creation attempts
    if (creationAttemptsRef.current >= MAX_CREATION_ATTEMPTS) {
      console.log(`Maximum audio creation attempts (${MAX_CREATION_ATTEMPTS}) reached, using existing audio element`);
      return audioRef.current;
    }
    
    creationAttemptsRef.current++;
    console.log(`Creating audio element attempt ${creationAttemptsRef.current}/${MAX_CREATION_ATTEMPTS} with URL:`, audioUrl);
    audioCreationInProgressRef.current = true;
    
    // Validate URL before proceeding
    if (!isValidAudioUrl(audioUrl)) {
      audioCreationInProgressRef.current = false;
      if (onError) onError(new Error("Invalid audio URL provided"));
      return null;
    }
    
    // Clean up existing audio element if it exists
    if (audioRef.current) {
      cleanupAudioElement(audioRef.current);
      audioRef.current = null;
    }
    
    // Clean up previous object URL if it exists
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
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
          audioCreationInProgressRef.current = false;
          
          // Set initial position if provided (only after metadata is loaded)
          if (initialProgress > 0) {
            audio.currentTime = initialProgress;
            setCurrentTime(initialProgress);
          }
        },
        
        onTimeUpdate: (time) => {
          setCurrentTime(time);
        },
        
        onEnded: () => {
          if (onComplete) onComplete();
        },
        
        onError: (e) => {
          audioCreationInProgressRef.current = false;
          const errorCode = audio.error ? audio.error.code : 'unknown';
          const errorMessage = audio.error ? audio.error.message : "Unknown audio error";
          console.error(`Audio error: code=${errorCode}, message=${errorMessage}`, e);
          
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
          } else if (onError) {
            onError(new Error(`Failed to load audio after ${maxRetries} attempts: ${errorMessage}`));
          }
        }
      });
      
      // Important: Use the cache system to improve reliability
      getAudioObjectUrl(audioUrl)
        .then(objectUrl => {
          if (!audio) return; // Audio might have been cleaned up
          objectUrlRef.current = objectUrl;
          audio.src = objectUrl;
          audio.load(); // Explicitly call load
          console.log("Setting audio source to cached/fetched object URL");
        })
        .catch(error => {
          if (!audio) return; // Audio might have been cleaned up
          audioCreationInProgressRef.current = false;
          console.error("Failed to get object URL, falling back to direct URL:", error);
          // Fall back to direct URL with cache busting as before
          const urlWithCache = createCacheBustedUrl(audioUrl);
          audio.src = urlWithCache;
          audio.load();
        });
      
      audioRef.current = audio;
      return audio;
    } catch (err) {
      audioCreationInProgressRef.current = false;
      console.error("Error creating audio element:", err);
      if (onError) onError(new Error("Failed to create audio element"));
      return null;
    }
  }, [audioUrl, initialProgress, onComplete, setLoaded, onError]);
  
  // Set up audio element with proper timing
  useEffect(() => {
    // Reset creation attempts when URL changes
    creationAttemptsRef.current = 0;
    audioCreationInProgressRef.current = false;

    // Validate URL thoroughly before proceeding
    if (!isValidAudioUrl(audioUrl)) {
      if (onError) onError(new Error("Invalid audio URL provided"));
      return () => {};
    }
    
    // Only create audio if none exists yet - ONCE
    if (!audioRef.current && creationAttemptsRef.current === 0) {
      // Use requestAnimationFrame instead of setTimeout for better timing
      const animFrameId = requestAnimationFrame(() => {
        const audio = createAudio();
        if (!audio && onError) {
          onError(new Error("Failed to create audio element"));
        }
      });
      
      return () => {
        cancelAnimationFrame(animFrameId);
      };
    }
    
    return () => {
      // Clean up object URL if it exists
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      
      if (audioRef.current) {
        cleanupAudioElement(audioRef.current);
        audioRef.current = null;
      }
      
      // Make sure we reset the flag to prevent blocking future audio creation
      audioCreationInProgressRef.current = false;
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
