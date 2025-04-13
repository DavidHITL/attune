
import React, { useState, useEffect } from 'react';
import { Message } from '@/utils/types';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import AttuneLogo from '@/components/AttuneLogo';
import { Phone, PhoneOff, MicOff, Mic, Timer } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface VoiceAssistantDisplayProps {
  user: any;
  status: string;
  isConnected: boolean;
  voiceActivityState: VoiceActivityState;
  messages: Message[];
  messageCount: number;
  hasContext: boolean;
  isMicOn: boolean;
  isMuted: boolean;
  conversationLoading: boolean;
  onToggleMicrophone: () => void;
  onToggleMute: () => void;
  onEndConversation: () => void;
  onStartConversation: () => void;
}

const VoiceAssistantDisplay: React.FC<VoiceAssistantDisplayProps> = ({
  user,
  isConnected,
  isMuted,
  onToggleMute,
  onEndConversation,
  onStartConversation
}) => {
  // Countdown timer state - 25 minutes in milliseconds
  const [timeLeft, setTimeLeft] = useState(25 * 60 * 1000);
  const isMobile = useIsMobile();
  
  // Start the countdown timer when connected
  useEffect(() => {
    if (!isConnected) return;
    
    // Update every minute
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        // Stop at zero
        if (prevTime <= 60000) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 60000;
      });
    }, 60000);
    
    return () => clearInterval(timer);
  }, [isConnected]);
  
  // Convert milliseconds to minutes (rounded down)
  const minutesLeft = Math.floor(timeLeft / (60 * 1000));
  
  // Create ripple effect for buttons
  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    
    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
      existingRipple.remove();
    }
    
    const ripple = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.nativeEvent.offsetX - diameter / 2}px`;
    ripple.style.top = `${event.nativeEvent.offsetY - diameter / 2}px`;
    
    ripple.classList.add('ripple');
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };
  
  // Handle button clicks with improved feedback
  const handleCallButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    if (isConnected) {
      toast.info("Call ended");
      onEndConversation();
    } else {
      toast.success("Starting conversation...");
      onStartConversation();
    }
  };
  
  const handleMuteButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    onToggleMute();
    toast.info(isMuted ? "Unmuted" : "Muted");
  };
  
  return (
    <div className="flex flex-col h-full relative">
      {/* Logo shown in both connected and disconnected states */}
      <div className={`${isConnected ? 'my-4' : 'mb-6'} flex justify-center`}>
        <AttuneLogo />
      </div>
      
      {/* Content container with different layout based on connection status */}
      {isConnected ? (
        <div className="flex flex-col items-center justify-center h-full">
          {/* Connected state content - positioned to be inside the animation circle */}
          <div className="text-center z-20 mt-8">
            <h1 className="text-4xl font-semibold text-white mb-4">
              Call in progress
            </h1>
            
            {/* Text centered in the animation circle */}
            <div className="max-w-xs mx-auto mb-6">
              <p className="text-white/90 px-2 text-lg">
                Your conversation is private and will be remembered for future sessions.
              </p>
            </div>
            
            {/* Countdown timer with better visibility */}
            <div className="text-center flex items-center justify-center mb-12">
              <Timer className="w-5 h-5 text-white mr-2" />
              <p className="text-white text-xl font-medium">{minutesLeft} minutes remaining</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Feel like talking?
          </h1>
          <p className="text-white/90 px-4">
            Attune remembers past conversations and keeps them secret, so you can always pick up where you left off — or not.
          </p>
        </div>
      )}

      {/* Call controls with improved accessibility and visual feedback */}
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
                ? 'bg-gray-700 hover:bg-gray-800' 
                : 'bg-white/90 hover:bg-white'
            }`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="h-6 w-6 text-white" strokeWidth={2} />
            ) : (
              <Mic className="h-6 w-6 text-[#1B4965]" strokeWidth={2} />
            )}
          </button>
        )}
      </div>
      
      {/* Add global styles for ripple effect */}
      <style jsx global>{`
        .ripple {
          position: absolute;
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 600ms linear;
          pointer-events: none;
        }
        
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceAssistantDisplay;
