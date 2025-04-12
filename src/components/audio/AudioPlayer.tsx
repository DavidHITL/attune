
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useAudioControl } from '@/hooks/useAudioControl';
import { toast } from 'sonner';
import AudioControls from './AudioControls';
import AudioProgress from './AudioProgress';
import AudioCover from './AudioCover';

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
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const {
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
  } = useAudioControl({
    audioUrl,
    initialProgress,
    onProgressUpdate,
    onComplete
  });
  
  // Prevent the audio player from being closed accidentally while playing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPlaying) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPlaying]);
  
  // Check if we've loaded after a timeout
  useEffect(() => {
    if (loaded) return;
    
    // After 5 seconds, check if audio has loaded
    const timeout = setTimeout(() => {
      if (!loaded) {
        // Increment load attempts
        setLoadAttempts(prev => {
          const newAttempt = prev + 1;
          
          // If we've tried 3 times, show an error toast
          if (newAttempt >= 3) {
            setLoadError("Audio is taking longer than expected to load. You may need to refresh the page.");
            toast.error("Audio failed to load properly. Try refreshing the page.");
          }
          
          return newAttempt;
        });
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [loaded]);
  
  const handleComplete = () => {
    onComplete();
    onClose();
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
          <AudioCover coverImage={coverImage} title={title} />
          
          {/* Title and description */}
          <div className="mb-6 text-center">
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            {description && (
              <div className="text-sm text-gray-700 max-h-24 overflow-y-auto mb-2">
                {description}
              </div>
            )}
          </div>
          
          {/* Error message */}
          {loadError && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {loadError}
              <Button
                variant="link"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-red-600 underline pl-1"
              >
                Refresh page
              </Button>
            </div>
          )}
          
          {/* Progress slider */}
          <AudioProgress
            currentTime={currentTime}
            duration={duration}
            loaded={loaded}
            onSeek={handleSeek}
          />
          
          {/* Player controls */}
          <AudioControls 
            isPlaying={isPlaying}
            loaded={loaded}
            onTogglePlay={togglePlayPause}
            onSkipBackward={skipBackward}
            onComplete={handleComplete}
            onRewind30={rewind30}
            onForward15={forward15}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioPlayer;
