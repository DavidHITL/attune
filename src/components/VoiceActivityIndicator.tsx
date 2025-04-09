
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
  // Simple text-based indicator instead of visualization
  return (
    <div className="h-8 px-4 py-6 rounded-full bg-attune-blue/30 backdrop-blur-sm flex items-center justify-center">
      <span className="text-sm text-attune-purple">
        {state === VoiceActivityState.Idle 
          ? 'Ready' 
          : state === VoiceActivityState.Input 
            ? 'Listening...' 
            : 'Speaking...'}
      </span>
    </div>
  );
};

export default VoiceActivityIndicator;
