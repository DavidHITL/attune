
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';

interface AudioControlsProps {
  isPlaying: boolean;
  loaded: boolean;
  onTogglePlay: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onRewind30: () => void;
  onForward15: () => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  loaded,
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
  onRewind30,
  onForward15
}) => {
  return (
    <div className="flex justify-center items-center space-x-4">
      <Button variant="ghost" size="icon" onClick={onRewind30} className="relative">
        <Rewind className="h-5 w-5" />
        <span className="absolute -bottom-4 text-xs font-medium">30</span>
      </Button>
      
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
      
      <Button variant="ghost" size="icon" onClick={onForward15} className="relative">
        <FastForward className="h-5 w-5" />
        <span className="absolute -bottom-4 text-xs font-medium">15</span>
      </Button>
    </div>
  );
};

export default AudioControls;
