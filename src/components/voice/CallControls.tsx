
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { createRipple } from '@/lib/animation-utils';

interface CallControlsProps {
  isConnected: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndConversation: () => void;
  onStartConversation: () => void;
  disabled?: boolean;
}

const CallControls: React.FC<CallControlsProps> = ({
  isConnected,
  isMuted,
  onToggleMute,
  onEndConversation,
  onStartConversation,
  disabled = false
}) => {
  // Enhanced click handler with visual feedback
  const handleActionClick = (handler: () => void, e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    if (!disabled) {
      handler();
    }
  };

  return (
    <div className="flex justify-center items-center space-x-6">
      {isConnected ? (
        <>
          <Button
            onClick={(e) => handleActionClick(onToggleMute, e)}
            className={`h-14 w-14 rounded-full p-0 flex items-center justify-center transition-colors ${
              isMuted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-white/20 hover:bg-white/30'
            }`}
            disabled={disabled}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
          </Button>

          <Button
            onClick={(e) => handleActionClick(onEndConversation, e)}
            className="bg-red-600 hover:bg-red-700 h-16 w-16 rounded-full p-0 flex items-center justify-center"
            disabled={disabled}
            aria-label="End call"
          >
            <PhoneOff className="h-8 w-8 text-white" />
          </Button>
        </>
      ) : (
        <Button
          onClick={(e) => handleActionClick(onStartConversation, e)}
          className="bg-emerald-600 hover:bg-emerald-700 h-16 w-16 rounded-full p-0 flex items-center justify-center animate-pulse"
          disabled={disabled}
          aria-label="Start call"
        >
          <Phone className="h-8 w-8 text-white" />
        </Button>
      )}
    </div>
  );
};

export default CallControls;
