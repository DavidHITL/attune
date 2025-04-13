
import React from 'react';
import CallTimer from './CallTimer';

interface ConnectedStateContentProps {
  minutesLeft: number;
}

const ConnectedStateContent: React.FC<ConnectedStateContentProps> = ({ 
  minutesLeft 
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center z-20 mt-8 mb-4">
        <h1 className="text-4xl font-semibold text-white mb-2">
          Call in progress
        </h1>
        
        {/* Text centered in the animation circle */}
        <div className="max-w-xs mx-auto mb-4">
          <p className="text-white/90 px-2 text-lg">
            Your conversation is private and will be remembered for future sessions.
          </p>
        </div>
        
        {/* Countdown timer with better visibility */}
        <CallTimer minutesLeft={minutesLeft} />
      </div>
    </div>
  );
};

export default ConnectedStateContent;
