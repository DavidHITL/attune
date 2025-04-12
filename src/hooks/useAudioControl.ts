import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAudioControlProps {
  audioUrl: string;
  initialProgress?: number;
  onProgressUpdate: (seconds: number) => void;
  onComplete: () => void;
}

export function useAudioControl({
  audioUrl,
  initialProgress = 0,
  onProgressUpdate,
  onComplete
}: UseAudioControlProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialProgress || 0);
  const [loaded, setLoaded] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Create audio element with error handling
  const createAudio = useCallback(() => {
    if (audioRef.current) {
      // Clean up existing audio element first
      audioRef.current.pause();
      audioRef.current.src = '';
      
      // Remove all event listeners
      audioRef.current.removeEventListener('loadedmetadata', () => {});
      audioRef.current.removeEventListener('timeupdate', () => {});
      audioRef.current.removeEventListener('ended', () => {});
      audioRef.current.removeEventListener('play', () => {});
      audioRef.current.removeEventListener('pause', () => {});
      audioRef.current.removeEventListener('error', () => {});
    }
    
    console.log("Creating new audio element with URL:", audioUrl);
    
    // Create fresh audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // Set up event listeners
    audio.addEventListener('loadedmetadata', () => {
      console.log("Audio metadata loaded, duration:", audio.duration);
      setDuration(audio.duration);
      setLoaded(true);
      retryCountRef.current = 0; // Reset retry counter on successful load
      
      // Set initial position if provided
      if (initialProgress && initialProgress > 0) {
        audio.currentTime = initialProgress;
        setCurrentTime(initialProgress);
      }
    });
    
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      onComplete();
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });
    
    // Handle errors
    audio.addEventListener('error', (e) => {
      console.error("Audio error:", e, audio.error);
      
      // Attempt to retry loading the audio
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`Retry attempt ${retryCountRef.current}/${maxRetries}`);
        
        // Small delay before retrying
        setTimeout(() => {
          createAudio();
        }, 1000);
      } else {
        toast.error("Failed to load audio. Please try again later.");
        console.error("Max retries reached for audio loading");
      }
    });
    
    // Add cache-busting parameter to prevent 304 responses
    audio.src = audioUrl.includes('?') 
      ? `${audioUrl}&_cb=${Date.now()}` 
      : `${audioUrl}?_cb=${Date.now()}`;
    
    // Preload audio
    audio.preload = "auto";
    
    // Return the audio element
    return audio;
  }, [audioUrl, initialProgress, onComplete]);
  
  // Set up audio element
  useEffect(() => {
    const audio = createAudio();
    
    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', () => {});
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('ended', () => {});
      audio.removeEventListener('play', () => {});
      audio.removeEventListener('pause', () => {});
      audio.removeEventListener('error', () => {});
    };
  }, [audioUrl, initialProgress, onComplete, createAudio]);
  
  // Update progress periodically and keep playback alive
  useEffect(() => {
    if (!isPlaying) return;
    
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
  }, [isPlaying, onProgressUpdate, currentTime, createAudio]);
  
  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      // Ensure we're sending an integer value to fix the database error
      onProgressUpdate(Math.floor(audioRef.current.currentTime));
    } else {
      audioRef.current.play().catch(err => {
        console.error("Error playing audio:", err);
        
        // If playback fails, try to recreate the audio element
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          console.log(`Recreating audio element, attempt ${retryCountRef.current}/${maxRetries}`);
          
          const audio = createAudio();
          audio.currentTime = currentTime;
          audio.play().catch(e => console.error("Error playing after recreation:", e));
        } else {
          toast.error("Failed to play audio. Please try again later.");
        }
      });
    }
  };
  
  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    // Ensure we're sending an integer value to fix the database error
    onProgressUpdate(Math.floor(newTime));
    
    // If already playing, continue playback
    // If paused, keep it paused
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.error("Error resuming playback after seeking:", err);
      });
    }
  };
  
  // Handle skip backward/forward
  const skipBackward = () => {
    if (!audioRef.current) return;
    
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
    if (!audioRef.current) return;
    
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

  // New functions for 30 sec rewind and 15 sec forward
  const rewind30 = () => {
    if (!audioRef.current) return;
    
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
    if (!audioRef.current) return;
    
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
