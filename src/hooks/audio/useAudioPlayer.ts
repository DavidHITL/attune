import { useState, useCallback } from 'react';
import { useAudioElement } from './useAudioElement';
import { useAudioProgress } from './useAudioProgress';
import { usePlaybackControls } from './usePlaybackControls';

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
