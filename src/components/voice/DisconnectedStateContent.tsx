
import React, { ReactNode } from 'react';

interface DisconnectedStateContentProps {
  errorMessage?: ReactNode;
}

const DisconnectedStateContent: React.FC<DisconnectedStateContentProps> = ({ errorMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6">
      <h2 className="text-2xl font-semibold mb-4 text-white">
        Let's talk
      </h2>
      <p className="text-white/90 mb-6">
        Tap the call button to start a voice chat with Attune.
      </p>
      
      {errorMessage}
    </div>
  );
};

export default DisconnectedStateContent;
