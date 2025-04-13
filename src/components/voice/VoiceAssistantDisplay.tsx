
import React, { useState, useEffect } from 'react';
import { Message } from '@/utils/types';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import AttuneLogo from '@/components/AttuneLogo';
import { Phone, PhoneOff, MicOff, Mic, Timer } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { createRipple } from '@/lib/animation-utils';
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
  
  // Start the countdown timer
  useEffect(() => {
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
  }, []);
  
  // Convert milliseconds to minutes (rounded down)
  const minutesLeft = Math.floor(timeLeft / (60 * 1000));
  
  // Handle button clicks with improved feedback
  const handleCallControlClick = (action: 'start' | 'end' | 'mute') => (event: React.MouseEvent<HTMLButtonElement>) => {
    // Add ripple effect
    createRipple(event);
    
    // Perform the action with feedback
    if (action === 'start') {
      onStartConversation();
      toast.success("Starting conversation...");
    } else if (action === 'end') {
      onEndConversation();
      toast.info("Call ended");
    } else if (action === 'mute') {
      onToggleMute();
      toast.info(isMuted ? "Unmuted" : "Muted");
    }
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
          {/* Connected state content */}
          <div className="text-center z-20 mt-8">
            <h1 className="text-4xl font-semibold text-white mb-4">
              Call in progress
            </h1>
            
            {/* Paragraph text positioned to be inside the animation circle */}
            <div className="max-w-xs mx-auto">
              <p className="text-white/90 px-2 text-lg mb-6">
                Your conversation is private and will be remembered for future sessions.
              </p>
            </div>
            
            {/* Countdown timer with better visibility - positioned to show inside the circle */}
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
      <div className="absolute bottom-24 left-0 right-0 flex justify-center space-x-6">
        {/* Call/End Call Button */}
        <button
          onClick={handleCallControlClick(isConnected ? 'end' : 'start')}
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
            onClick={handleCallControlClick('mute')}
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
    </div>
  );
};

export default VoiceAssistantDisplay;
