
import React from 'react';

interface AudioWaveformProps {
  isActive: boolean;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ isActive }) => {
  // Return empty placeholder instead of waveform visualization
  return (
    <div className="flex items-center justify-center h-40">
      {isActive ? (
        <span className="text-attune-indigo">Audio active</span>
      ) : (
        <span className="text-gray-400">Audio inactive</span>
      )}
    </div>
  );
};

export default AudioWaveform;
