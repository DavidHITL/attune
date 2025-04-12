
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
    
    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', () => {});
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('ended', () => {});
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
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    onProgressUpdate(newTime);
  };
  
  // Handle skip backward/forward
  const skipBackward = () => {
    if (!audioRef.current) return;
    
    const newTime = Math.max(0, audioRef.current.currentTime - 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const skipForward = () => {
    if (!audioRef.current) return;
    
    const newTime = Math.min(duration, audioRef.current.currentTime + 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  return (
    <Card className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-[390px] shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-slate-200 rounded overflow-hidden mr-3">
              {coverImage ? (
                <img src={coverImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-attune-blue/40">
                  <span className="text-xl opacity-30">🎧</span>
                </div>
              )}
            </div>
            <div className="flex-1 mr-2">
              <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
              {description && (
                <p className="text-xs line-clamp-1 text-gray-600">{description}</p>
              )}
              <div className="text-xs text-gray-500">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mb-4">
          <Slider
            disabled={!loaded}
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
          />
        </div>
        
        <div className="flex justify-center items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={skipBackward}>
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button 
            disabled={!loaded} 
            className="rounded-full" 
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={skipForward}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioPlayer;
