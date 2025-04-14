
import { RefObject, useEffect } from 'react';

interface HeartbeatProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying?: boolean;
  currentTime: number;
  onProgressUpdate?: (seconds: number) => void;
  createAudio?: () => HTMLAudioElement;
}

/**
 * Handles periodic progress updates and ensures continuous playback
 */
export function useAudioHeartbeat({
  audioRef,
  isPlaying,
  currentTime,
  onProgressUpdate,
  createAudio
}: HeartbeatProps) {
  useEffect(() => {
    if (!isPlaying || !onProgressUpdate || !createAudio) return;
    
    const retryCountRef = { current: 0 };
    const maxRetries = 1; // Reduced from 3 to 1 to prevent cascading recreation
    
    // Update progress every 5 seconds
    const updateInterval = setInterval(() => {
      if (audioRef.current) {
        // Ensure we're sending an integer value to fix the database error
        onProgressUpdate(Math.floor(audioRef.current.currentTime));
      }
    }, 5000);
    
    // Add heartbeat to ensure continuous playback - less aggressive now
    const heartbeatInterval = setInterval(() => {
      if (audioRef.current) {
        if (isPlaying && audioRef.current.paused && retryCountRef.current < maxRetries) {
          console.log("Detected paused state when should be playing, attempting to resume...");
          retryCountRef.current += 1;
          
          // Don't recreate, just try to play once more
          audioRef.current.play().catch(e => {
            console.error("Error resuming playback:", e);
            // We won't try to recreate audio anymore to prevent infinite loops
          });
        }
      }
    }, 3000); // Changed from 1000ms to 3000ms to be less aggressive
    
    return () => {
      clearInterval(updateInterval);
      clearInterval(heartbeatInterval);
    };
  }, [isPlaying, onProgressUpdate, createAudio, currentTime, audioRef]);
  
  // We don't return anything - this is just an effect
  return {};
}
