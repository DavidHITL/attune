import { RefObject } from 'react';
import { useAudioNavigation } from './utils/audioNavigation';
import { useAudioHeartbeat } from './utils/audioHeartbeat';

interface UseAudioProgressProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  duration?: number;
  currentTime: number;
  isPlaying?: boolean;
  setCurrentTime?: (time: number) => void;
  onProgressUpdate?: (seconds: number) => void;
  createAudio?: () => HTMLAudioElement | null;
}

// Define a consistent return type for the navigation functions
export interface AudioNavigationControls {
  handleSeek: (value: number[]) => void;
  skipBackward: () => void;
  skipForward: () => void;
  rewind30: () => void;
  forward15: () => void;
}

/**
 * Combined hook for audio progress management and navigation
 */
export function useAudioProgress({
  audioRef,
  duration,
  currentTime,
  isPlaying,
  setCurrentTime,
  onProgressUpdate,
  createAudio
}: UseAudioProgressProps): AudioNavigationControls {
  // Use navigation controls if we have setCurrentTime function
  const navigation = useAudioNavigation({
    audioRef,
    duration,
    isPlaying,
    setCurrentTime,
    onProgressUpdate
  });
  
  // Always use heartbeat functionality
  useAudioHeartbeat({
    audioRef,
    isPlaying,
    currentTime,
    onProgressUpdate
    // Removed createAudio as we don't actually use it in the heartbeat implementation
  });
  
  // If this is used purely for navigation controls, return those
  if (setCurrentTime) {
    return navigation;
  }
  
  // Otherwise return empty functions that maintain the same interface
  return {
    handleSeek: () => {},
    skipBackward: () => {},
    skipForward: () => {},
    rewind30: () => {},
    forward15: () => {}
  };
}
