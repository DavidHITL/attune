
import React, { useState, useEffect } from 'react';
import { Message } from '@/utils/types';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import AttuneLogo from '@/components/AttuneLogo';
import { Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
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
    <div className="flex flex-col h-full">
      {/* Logo and Header */}
      <div className="mb-8 flex justify-center">
        <AttuneLogo />
      </div>
      
      {/* Voice interaction instructions */}
      <div className="text-center my-6 text-white font-sans">
        <p className="text-white">
          Feel like talking? Attune remembers past conversations and keeps them secret, 
          so you can always pick up where you left off — or not.
        </p>
      </div>
      
      {/* Countdown timer */}
      <div className="text-center mt-4 mb-8">
        <p className="text-sm text-white font-sans">{minutesLeft} min remaining</p>
      </div>

      {/* Call controls */}
      <div className="mt-auto mb-16 flex flex-col items-center">
        {/* Main Call Button */}
        <div 
          onClick={isConnected ? onEndConversation : onStartConversation}
          className="w-24 h-24 rounded-full bg-slate-300/80 border-none shadow-lg hover:bg-slate-300/90 transition-all cursor-pointer flex items-center justify-center mb-6"
        >
          {isConnected ? (
            <PhoneOff className="h-6 w-6 text-black" strokeWidth={1.5} />
          ) : (
            <Phone className="h-6 w-6 text-attune-deep-blue" strokeWidth={1.5} />
          )}
        </div>

        {/* Mute Button - Only show when connected */}
        {isConnected && (
          <Button 
            onClick={onToggleMute}
            variant="outline"
            size="sm"
            className="bg-white/20 border-none text-white hover:bg-white/30 transition-all"
          >
            {isMuted ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                <span>Unmute</span>
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                <span>Mute</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistantDisplay;
