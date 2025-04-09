
import React from 'react';

interface VoiceActivityIndicatorProps {
  isActive: boolean;
  activityType?: 'input' | 'output';
}

const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({ 
  isActive, 
  activityType = 'output' 
}) => {
  if (!isActive) {
    return null;
  }

  return (
    <div className="flex justify-center items-center gap-1">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className={`w-1 ${
            activityType === 'input' ? 'bg-attune-indigo' : 'bg-attune-purple'
          } ${isActive ? `animate-sound-wave-${index % 5 + 1}` : 'h-2'} rounded-full`}
          style={{
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

export default VoiceActivityIndicator;
