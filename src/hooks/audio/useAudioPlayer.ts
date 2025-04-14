
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioElement } from './useAudioElement';
import { useAudioProgress } from './useAudioProgress';
import { usePlaybackControls } from './usePlaybackControls';
import { useAudioHeartbeat } from './utils/audioHeartbeat';
import { toast } from 'sonner';

interface UseAudioPlayerProps {
  audioUrl: string;
  initialProgress?: number;
  onProgressUpdate: (seconds: number) => void;
  onComplete: () => void;
}

export function useAudioPlayer({
  audioUrl,
  initialProgress = 0,
  onProgressUpdate,
  onComplete
}: UseAudioPlayerProps) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastProgressUpdateRef = useRef(0);
  const lastProgressValueRef = useRef(0);
  
  // Validate the URL thoroughly before proceeding
  const isValidUrl = useCallback((url: string): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.error("Empty or invalid audio URL:", url);
      return false;
    }
    
    try {
      new URL(url); // Tests if URL is well-formed
      return true;
    } catch (e) {
      console.error("Malformed URL:", url, e);
      return false;
    }
  }, []);
  
  const validatedUrl = isValidUrl(audioUrl) ? audioUrl : '';
  
  useEffect(() => {
    if (!isValidUrl(audioUrl)) {
      setLoadError("Invalid audio URL provided");
      toast.error("This audio file can't be played. It may be missing or unavailable.");
    } else {
      setLoadError(null);
    }
  }, [audioUrl, isValidUrl]);
  
  const {
    audioRef,
    duration,
    currentTime,
    setCurrentTime,
    createAudio
  } = useAudioElement({
    audioUrl: validatedUrl,
    initialProgress,
    onComplete,
    setLoaded,
    onError: (error) => {
      console.error("Audio element error:", error);
      setLoadError(error.message || "Failed to load audio");
      toast.error("Failed to load audio. Please try again later.");
    }
  });
  
  const { isPlaying, togglePlayPause } = usePlaybackControls({
    audioRef,
    currentTime,
    createAudio
  });
  
  const { 
    handleSeek,
    skipBackward,
    skipForward,
    rewind30,
    forward15
  } = useAudioProgress({
    audioRef,
    duration,
    currentTime,
    setCurrentTime,
    isPlaying
  });
  
  // Debounced progress update to prevent excessive database calls
  const handleProgressUpdate = useCallback((seconds: number) => {
    const now = Date.now();
    
    // Don't update progress too frequently (at most every 3 seconds)
    // And only when there's been an actual change in position
    if (
      now - lastProgressUpdateRef.current > 3000 &&
      Math.abs(seconds - lastProgressValueRef.current) > 1
    ) {
      lastProgressUpdateRef.current = now;
      lastProgressValueRef.current = seconds;
      onProgressUpdate(Math.floor(seconds));
    }
  }, [onProgressUpdate]);
  
  // Use the standalone heartbeat hook
  useAudioHeartbeat({
    audioRef,
    isPlaying,
    currentTime,
    onProgressUpdate: handleProgressUpdate
  });

  return {
    isPlaying,
    duration,
    currentTime,
    loaded,
    error: loadError,
    togglePlayPause,
    handleSeek,
    skipBackward,
    skipForward,
    rewind30,
    forward15
  };
}
