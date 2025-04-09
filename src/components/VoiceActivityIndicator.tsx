
import React from 'react';

interface VoiceActivityIndicatorProps {
  isActive: boolean;
}

const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({ isActive }) => {
  if (!isActive) {
    return null;
  }

  return (
    <div className="flex justify-center items-center gap-1">
      <div className={`w-1 bg-attune-purple ${isActive ? 'animate-sound-wave-1' : 'h-2'} rounded-full`}></div>
      <div className={`w-1 bg-attune-purple ${isActive ? 'animate-sound-wave-2' : 'h-2'} rounded-full`}></div>
      <div className={`w-1 bg-attune-purple ${isActive ? 'animate-sound-wave-3' : 'h-2'} rounded-full`}></div>
      <div className={`w-1 bg-attune-purple ${isActive ? 'animate-sound-wave-4' : 'h-2'} rounded-full`}></div>
      <div className={`w-1 bg-attune-purple ${isActive ? 'animate-sound-wave-5' : 'h-2'} rounded-full`}></div>
    </div>
  );
};

export default VoiceActivityIndicator;
