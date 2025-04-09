
import React from 'react';

export enum VoiceActivityState {
  Idle = 'idle',
  Input = 'input',
  Output = 'output'
}

interface VoiceActivityIndicatorProps {
  state: VoiceActivityState;
}

const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({ state }) => {
  return (
    <div className="flex justify-center items-center gap-2 h-10 px-6 py-8 rounded-full bg-attune-blue/30 backdrop-blur-sm">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className={`w-1.5 rounded-full transition-all duration-300 ${
            state === VoiceActivityState.Idle 
              ? 'bg-gray-400 h-3' 
              : state === VoiceActivityState.Input 
                ? 'bg-attune-indigo animate-sound-wave-' + ((index % 5) + 1)
                : 'bg-attune-purple/70 animate-sound-wave-' + ((index % 5) + 1)
          }`}
          style={{
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

export default VoiceActivityIndicator;
