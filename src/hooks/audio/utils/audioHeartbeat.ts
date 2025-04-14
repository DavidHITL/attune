
import { RefObject, useEffect } from 'react';

interface HeartbeatProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying?: boolean;
  currentTime: number;
  onProgressUpdate?: (seconds: number) => void;
  createAudio?: () => HTMLAudioElement | null;
}

/**
 * Handles periodic progress updates without any recreation logic
 */
export function useAudioHeartbeat({
  audioRef,
  isPlaying,
  onProgressUpdate
}: HeartbeatProps) {
  useEffect(() => {
    if (!isPlaying || !onProgressUpdate) return;
    
    // Only update progress every 5 seconds
    const updateInterval = setInterval(() => {
      if (audioRef.current) {
        // Ensure we're sending an integer value to fix the database error
        onProgressUpdate(Math.floor(audioRef.current.currentTime));
      }
    }, 5000);
    
    return () => {
      clearInterval(updateInterval);
    };
  }, [isPlaying, onProgressUpdate, audioRef]);
  
  // We don't return anything - this is just an effect
  return {};
}
