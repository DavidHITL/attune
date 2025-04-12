
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
    const maxRetries = 3;
    
    // Update progress every 5 seconds
    const updateInterval = setInterval(() => {
      if (audioRef.current) {
        // Ensure we're sending an integer value to fix the database error
        onProgressUpdate(Math.floor(audioRef.current.currentTime));
      }
    }, 5000);
    
    // Add heartbeat to ensure continuous playback
    const heartbeatInterval = setInterval(() => {
      if (audioRef.current) {
        if (isPlaying && audioRef.current.paused) {
          console.log("Detected paused state when should be playing, resuming...");
          
          // If we're supposed to be playing but the audio is paused, resume
          audioRef.current.play().catch(err => {
            console.error("Error resuming playback:", err);
            
            // If playback fails, try to recreate the audio element
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current += 1;
              console.log(`Recreating audio element, attempt ${retryCountRef.current}/${maxRetries}`);
              
              const audio = createAudio();
              if (audio) {
                audio.currentTime = currentTime;
                audio.play().catch(e => console.error("Error playing after recreation:", e));
              }
            }
          });
        }
        
        // Check if audio position is stuck
        if (isPlaying && !audioRef.current.paused) {
          const lastTime = currentTime;
          setTimeout(() => {
            if (isPlaying && Math.abs(currentTime - lastTime) < 0.1) {
              console.log("Audio position appears stuck, nudging playback");
              // Nudge playback position slightly to unstick it
              if (audioRef.current) {
                audioRef.current.currentTime += 0.1;
              }
            }
          }, 500);
        }
      }
    }, 1000); // Check every second
    
    return () => {
      clearInterval(updateInterval);
      clearInterval(heartbeatInterval);
    };
  }, [isPlaying, onProgressUpdate, createAudio, currentTime, audioRef]);
  
  // We don't return anything - this is just an effect
  return {};
}
