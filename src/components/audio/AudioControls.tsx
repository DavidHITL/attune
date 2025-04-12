
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface AudioControlsProps {
  isPlaying: boolean;
  loaded: boolean;
  onTogglePlay: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  loaded,
  onTogglePlay,
  onSkipBackward,
  onSkipForward
}) => {
  return (
    <div className="flex justify-center items-center space-x-6">
      <Button variant="ghost" size="icon" onClick={onSkipBackward}>
        <SkipBack className="h-5 w-5" />
      </Button>
      
      <Button 
        disabled={!loaded} 
        className="rounded-full h-14 w-14 flex items-center justify-center"
        onClick={onTogglePlay}
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6 ml-1" />
        )}
      </Button>
      
      <Button variant="ghost" size="icon" onClick={onSkipForward}>
        <SkipForward className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default AudioControls;
