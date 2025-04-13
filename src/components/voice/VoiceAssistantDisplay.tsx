
import React, { useState, useEffect } from 'react';
import { Message } from '@/utils/types';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import AttuneLogo from '@/components/AttuneLogo';
import { Phone, PhoneOff, MicOff, Mic, Timer } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

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
  conversationLoading,
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
  
  return (
    <div className="flex flex-col h-full relative">
      {/* Logo shown in both connected and disconnected states */}
      <div className={`${isConnected ? 'my-4' : 'mb-6'} flex justify-center`}>
        <AttuneLogo />
      </div>
      
      {/* Content container with different layout based on connection status */}
      {isConnected ? (
        <div className="flex flex-col items-center justify-center h-full max-w-[300px] mx-auto">
          {/* Connected state - centered within the circle */}
          <div className="text-center mb-6 z-20">
            <h1 className="text-4xl font-semibold text-white mb-4">
              Call in progress
            </h1>
            <p className="text-white/90 px-2 text-lg">
              Your conversation is private and will be remembered for future sessions.
            </p>
          </div>
          
          {/* Countdown timer with better visibility - centered within circle */}
          <div className="text-center mb-8 flex items-center justify-center">
            <Timer className="w-5 h-5 text-white mr-2" />
            <p className="text-white text-xl font-medium">{minutesLeft} minutes remaining</p>
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

      {/* Call controls - positioned at bottom of screen but above nav */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center space-x-6">
        {/* Call/End Call Button */}
        <button
          onClick={isConnected ? onEndConversation : onStartConversation}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 ${
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
            onClick={onToggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 ${
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
