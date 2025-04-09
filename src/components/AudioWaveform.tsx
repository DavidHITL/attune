
import React from 'react';

interface AudioWaveformProps {
  isActive: boolean;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ isActive }) => {
  return (
    <div className="flex items-center justify-center h-40 gap-2">
      {[...Array(15)].map((_, index) => (
        <div
          key={index}
          className={`w-2 rounded-full bg-attune-indigo ${
            isActive ? `animate-sound-wave-${(index % 5) + 1}` : 'h-3'
          }`}
          style={{
            animationDelay: `${index * 0.1}s`,
            height: isActive ? `${Math.random() * 2 + 1}rem` : '0.5rem'
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;
