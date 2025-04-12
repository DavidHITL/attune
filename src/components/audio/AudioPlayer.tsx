
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useAudioControl } from '@/hooks/useAudioControl';
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
  const {
    isPlaying,
    duration,
    currentTime,
    loaded,
    togglePlayPause,
    handleSeek,
    skipBackward,
    skipForward
  } = useAudioControl({
    audioUrl,
    initialProgress,
    onProgressUpdate,
    onComplete
  });
  
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
            onSkipForward={skipForward}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioPlayer;
