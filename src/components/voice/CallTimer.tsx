
import React from 'react';
import { Timer } from 'lucide-react';

interface CallTimerProps {
  minutesLeft: number;
}

const CallTimer: React.FC<CallTimerProps> = ({ minutesLeft }) => {
  return (
    <div className="text-center flex items-center justify-center mb-12">
      <Timer className="w-5 h-5 text-white mr-2" />
      <p className="text-white text-xl font-medium">{minutesLeft} minutes remaining</p>
    </div>
  );
};

export default CallTimer;
