
import { useState, useCallback } from 'react';
import { useAudioElement } from './useAudioElement';
import { useAudioProgress } from './useAudioProgress';
import { usePlaybackControls } from './usePlaybackControls';
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
  
  // Validate the URL before proceeding
  const isValidUrl = audioUrl && typeof audioUrl === 'string' && audioUrl.trim() !== '';
  
  if (!isValidUrl) {
    console.error("Invalid audio URL provided:", audioUrl);
    // Don't show toast here as it could trigger multiple times during rendering
    // We'll handle the error in the useEffect below
  }
  
  const {
    audioRef,
    duration,
    currentTime,
    setCurrentTime,
    createAudio
  } = useAudioElement({
    audioUrl: isValidUrl ? audioUrl : '',
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
  
  // Update progress periodically and keep playback alive
  useAudioProgress({
    audioRef,
    isPlaying,
    currentTime,
    onProgressUpdate,
    createAudio
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
