
import React from 'react';
import VoiceActivityIndicator, { VoiceActivityState } from '../VoiceActivityIndicator';
import AttuneLogo from '@/components/AttuneLogo';

interface StatusIndicatorProps {
  status: string;
  isConnected: boolean;
  voiceActivityState: VoiceActivityState;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  isConnected,
  voiceActivityState 
}) => {
  return (
    <div className="text-center text-white mb-4 mt-4">
      <div className="mb-2">
        <AttuneLogo />
      </div>
      
      {/* Voice activity indicator - always visible when connected */}
      {isConnected && (
        <div className="flex items-center gap-2 justify-center mt-2">
          <VoiceActivityIndicator state={voiceActivityState} />
        </div>
      )}
    </div>
  );
};

export default StatusIndicator;
