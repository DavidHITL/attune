import { RefObject } from 'react';

interface NavigationProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  duration?: number;
  isPlaying?: boolean;
  setCurrentTime?: (time: number) => void;
  onProgressUpdate?: (seconds: number) => void;
}

/**
 * Handles audio navigation controls like seeking and skipping
 */
export function useAudioNavigation({
  audioRef,
  duration,
  isPlaying,
  setCurrentTime,
  onProgressUpdate
}: NavigationProps) {
  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioRef.current || !setCurrentTime) return;
    
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Update progress if callback provided
    if (onProgressUpdate) {
      // Ensure we're sending an integer value to fix the database error
      onProgressUpdate(Math.floor(newTime));
    }
    
    // If already playing, continue playback
    // If paused, keep it paused
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.error("Error resuming playback after seeking:", err);
      });
    }
  };
  
  // Basic navigation controls
  const skipBackward = () => {
    if (!audioRef.current || !setCurrentTime) return;
    
    // Jump to 1 second (which is min 0, sec 1)
    const newTime = 1;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Maintain current play state
    if (isPlaying && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.error("Error resuming after skipping backward:", err);
      });
    }
  };
  
  const skipForward = () => {
    if (!audioRef.current || !setCurrentTime || !duration) return;
    
    const newTime = Math.min(duration, audioRef.current.currentTime + 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Maintain current play state
    if (isPlaying && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.error("Error resuming after skipping forward:", err);
      });
    }
  };

  // Advanced navigation controls
  const rewind30 = () => {
    if (!audioRef.current || !setCurrentTime) return;
    
    const newTime = Math.max(0, audioRef.current.currentTime - 30);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Maintain current play state
    if (isPlaying && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.error("Error resuming after rewinding 30 seconds:", err);
      });
    }
  };
  
  const forward15 = () => {
    if (!audioRef.current || !setCurrentTime || !duration) return;
    
    const newTime = Math.min(duration, audioRef.current.currentTime + 15);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Maintain current play state
    if (isPlaying && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.error("Error resuming after forwarding 15 seconds:", err);
      });
    }
  };

  return {
    handleSeek,
    skipBackward,
    skipForward,
    rewind30,
    forward15
  };
}
