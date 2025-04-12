
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
  
  // Validate the URL before proceeding
  if (!audioUrl || typeof audioUrl !== 'string' || audioUrl.trim() === '') {
    console.error("Invalid audio URL provided:", audioUrl);
    toast.error("Invalid audio URL. Please select a different audio track.");
  }
  
  const {
    audioRef,
    duration,
    currentTime,
    setCurrentTime,
    createAudio
  } = useAudioElement({
    audioUrl,
    initialProgress,
    onComplete,
    setLoaded
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
    togglePlayPause,
    handleSeek,
    skipBackward,
    skipForward,
    rewind30,
    forward15
  };
}
