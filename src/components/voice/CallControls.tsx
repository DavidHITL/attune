
import React from 'react';
import { Phone, PhoneOff, MicOff, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { createRipple } from '@/lib/animation-utils';

interface CallControlsProps {
  isConnected: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndConversation: () => void;
  onStartConversation: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({
  isConnected,
  isMuted,
  onToggleMute,
  onEndConversation,
  onStartConversation
}) => {
  // Handle button clicks with improved feedback
  const handleCallButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("Call button clicked, isConnected:", isConnected);
    createRipple(e);
    
    if (isConnected) {
      console.log("Ending conversation...");
      toast.info("Call ended");
      onEndConversation();
    } else {
      console.log("Starting conversation...");
      toast.success("Starting conversation...");
      onStartConversation();
    }
  };
  
  const handleMuteButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("Mute button clicked");
    createRipple(e);
    onToggleMute();
  };

  return (
    <div className="fixed left-0 right-0 bottom-24 flex justify-center space-x-6">
      {/* Call/End Call Button */}
      <button
        onClick={handleCallButton}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 overflow-hidden ${
          isConnected 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-white hover:bg-gray-100'
        }`}
        aria-label={isConnected ? "End call" : "Start call"}
      >
        {isConnected ? (
          <PhoneOff className="h-6 w-6 text-white" strokeWidth={2} />
        ) : (
          <Phone className="h-6 w-6 text-[#1B4965]" strokeWidth={2} />
        )}
      </button>

      {/* Mute Button - only show when connected */}
      {isConnected && (
        <button
          onClick={handleMuteButton}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 overflow-hidden ${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-white/90 hover:bg-white'
          }`}
          aria-label={isMuted ? "Enable microphone" : "Disable microphone completely"}
          title={isMuted ? "Enable microphone" : "Disable microphone completely"}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6 text-white" strokeWidth={2} />
          ) : (
            <Mic className="h-6 w-6 text-[#1B4965]" strokeWidth={2} />
          )}
        </button>
      )}
    </div>
  );
};

export default CallControls;
