
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { formatTime } from '@/utils/formatters';

interface AudioProgressProps {
  currentTime: number;
  duration: number;
  loaded: boolean;
  onSeek: (value: number[]) => void;
}

const AudioProgress: React.FC<AudioProgressProps> = ({
  currentTime,
  duration,
  loaded,
  onSeek
}) => {
  return (
    <div className="mb-6">
      <Slider
        disabled={!loaded}
        value={[currentTime]}
        min={0}
        max={duration || 100}
        step={1}
        onValueChange={onSeek}
        className="mt-2"
      />
      <div className="text-sm text-gray-500 mt-2 text-center">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
};

export default AudioProgress;
