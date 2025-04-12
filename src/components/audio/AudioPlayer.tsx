import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { formatTime } from '@/utils/formatters';

interface AudioPlayerProps {
  title: string;
  description?: string | null;
  audioUrl: string;
  coverImage?: string | null;
  initialProgress?: number;
  onClose: () => void;
  onProgressUpdate: (seconds: number) => void;
  onComplete: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  title,
  description,
  audioUrl,
  coverImage,
  initialProgress = 0,
  onClose,
  onProgressUpdate,
  onComplete
}) => {
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
        onProgressUpdate(audioRef.current.currentTime);
      }
    }, 5000); // Update every 5 seconds while playing
    
    return () => clearInterval(interval);
  }, [isPlaying, onProgressUpdate]);
  
  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      onProgressUpdate(audioRef.current.currentTime);
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
    onProgressUpdate(newTime);
    
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
    
    const newTime = Math.max(0, audioRef.current.currentTime - 10);
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
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-xl" onClick={onClose}></div>
      
      {/* Player container */}
      <Card className="relative w-full max-w-[390px] shadow-xl bg-white/80 backdrop-blur-md border border-white/20 z-10">
        <CardContent className="p-6">
          {/* Close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="absolute top-4 right-4 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          
          {/* Cover image */}
          <div className="flex justify-center mb-6">
            <div className="h-36 w-36 rounded-lg overflow-hidden shadow-md">
              {coverImage ? (
                <img src={coverImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-attune-blue/40">
                  <span className="text-4xl opacity-30">🎧</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Title and description */}
          <div className="mb-6 text-center">
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            {description && (
              <div className="text-sm text-gray-700 max-h-24 overflow-y-auto mb-2">
                {description}
              </div>
            )}
            <div className="text-sm text-gray-500 mt-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          {/* Progress slider */}
          <div className="mb-6">
            <Slider
              disabled={!loaded}
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="mt-2"
            />
          </div>
          
          {/* Player controls */}
          <div className="flex justify-center items-center space-x-6">
            <Button variant="ghost" size="icon" onClick={skipBackward}>
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button 
              disabled={!loaded} 
              className="rounded-full h-14 w-14 flex items-center justify-center"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>
            
            <Button variant="ghost" size="icon" onClick={skipForward}>
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioPlayer;
