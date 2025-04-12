
import { useState, useRef, useEffect } from 'react';

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
  
  // Set up audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setLoaded(true);
      
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
    
    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', () => {});
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('ended', () => {});
      audio.removeEventListener('play', () => {});
      audio.removeEventListener('pause', () => {});
    };
  }, [audioUrl, initialProgress, onComplete]);
  
  // Update progress periodically
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      if (audioRef.current) {
        // Ensure we're sending an integer value to fix the database error
        onProgressUpdate(Math.floor(audioRef.current.currentTime));
      }
    }, 5000); // Update every 5 seconds while playing
    
    return () => clearInterval(interval);
  }, [isPlaying, onProgressUpdate]);
  
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
