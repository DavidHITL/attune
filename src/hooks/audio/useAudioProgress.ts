import { useEffect, useCallback, RefObject } from 'react';

interface UseAudioProgressProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  duration?: number;
  currentTime: number;
  isPlaying?: boolean;
  setCurrentTime?: (time: number) => void;
  onProgressUpdate?: (seconds: number) => void;
  createAudio?: () => HTMLAudioElement;
}

export function useAudioProgress({
  audioRef,
  duration,
  currentTime,
  isPlaying,
  setCurrentTime,
  onProgressUpdate,
  createAudio
}: UseAudioProgressProps) {
  const retryCountRef = { current: 0 };
  const maxRetries = 3;
  
  // Handle seeking
  const handleSeek = useCallback((value: number[]) => {
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
  }, [audioRef, setCurrentTime, isPlaying, onProgressUpdate]);
  
  // Navigation controls
  const skipBackward = useCallback(() => {
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
  }, [audioRef, setCurrentTime, isPlaying]);
  
  const skipForward = useCallback(() => {
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
  }, [audioRef, setCurrentTime, duration, isPlaying]);

  // New functions for 30 sec rewind and 15 sec forward
  const rewind30 = useCallback(() => {
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
  }, [audioRef, setCurrentTime, isPlaying]);
  
  const forward15 = useCallback(() => {
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
  }, [audioRef, setCurrentTime, duration, isPlaying]);

  // Periodic progress updates and heartbeat
  useEffect(() => {
    if (!isPlaying || !onProgressUpdate || !createAudio) return;
    
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
              audio.currentTime = currentTime;
              audio.play().catch(e => console.error("Error playing after recreation:", e));
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
              audioRef.current!.currentTime += 0.1;
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

  // If this is used purely for navigation controls, return those
  if (setCurrentTime) {
    return {
      handleSeek,
      skipBackward,
      skipForward,
      rewind30,
      forward15
    };
  }
  
  // Otherwise return nothing (for the progress tracking effect)
  return {};
}
