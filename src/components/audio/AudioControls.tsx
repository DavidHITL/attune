
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, CheckCircle, Rewind, FastForward } from 'lucide-react';

interface AudioControlsProps {
  isPlaying: boolean;
  loaded: boolean;
  onTogglePlay: () => void;
  onSkipBackward: () => void;
  onComplete: () => void;
  onRewind30: () => void;
  onForward15: () => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  loaded,
  onTogglePlay,
  onSkipBackward,
  onComplete,
  onRewind30,
  onForward15
}) => {
  return (
    <div className="flex justify-center items-center space-x-4">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onSkipBackward}
        className="control-button-hover"
      >
        <SkipBack className="h-5 w-5" />
      </Button>
      
      <Button 
        variant="ghost"
        onClick={onRewind30}
        className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-black/5 relative control-button-hover"
      >
        <div className="relative">
          <Rewind className="h-5 w-5" />
          <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-[10px] font-medium">30</span>
        </div>
      </Button>
      
      <Button 
        disabled={!loaded} 
        className={`rounded-full h-14 w-14 flex items-center justify-center ${isPlaying ? 'pulse-animation' : ''}`}
        onClick={onTogglePlay}
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6 ml-1" />
        )}
      </Button>
      
      <Button 
        variant="ghost"
        onClick={onForward15}
        className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-black/5 relative control-button-hover"
      >
        <div className="relative">
          <FastForward className="h-5 w-5" />
          <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-[10px] font-medium">15</span>
        </div>
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onComplete}
        className="control-button-hover"
      >
        <CheckCircle className="h-5 w-5 text-black" />
      </Button>
    </div>
  );
};

export default AudioControls;
