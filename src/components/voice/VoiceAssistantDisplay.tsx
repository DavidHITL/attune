
import React, { useState, useEffect } from 'react';
import { Message } from '@/utils/types';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import CallControls from '@/components/CallControls';
import AttuneLogo from '@/components/AttuneLogo';
import { PhoneCall } from 'lucide-react';

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
  voiceActivityState,
  isMicOn,
  isMuted,
  conversationLoading,
  onToggleMicrophone,
  onToggleMute,
  onEndConversation,
  onStartConversation
}) => {
  // Countdown timer state - 25 minutes in milliseconds
  const [timeLeft, setTimeLeft] = useState(25 * 60 * 1000);
  
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
      {!isConnected && (
        <div className="text-center my-6 text-black">
          <p>Feel like talking? Attune remembers past conversations and keeps them secret, so you can always pick up where you left off — or not.</p>
        </div>
      )}
      
      {isConnected && (
        <div className="text-center my-6 text-black">
          <p>Attune remembers past conversations and keeps them secret, so you can always pick up where you left off — or not.</p>
        </div>
      )}
      
      {/* Countdown timer */}
      <div className="text-center mt-4 mb-8">
        <p className="text-sm text-black">{minutesLeft} min remaining</p>
      </div>

      {/* Call controls */}
      <div className="flex justify-center mt-auto mb-6">
        {!isConnected ? (
          <div
            onClick={onStartConversation}
            className="w-24 h-24 rounded-full bg-slate-300/80 border-none shadow-lg hover:bg-slate-300/90 transition-all cursor-pointer flex items-center justify-center"
          >
            <PhoneCall className="h-6 w-6 text-black" strokeWidth={1.5} />
          </div>
        ) : (
          <CallControls
            isMicOn={isMicOn}
            isMuted={isMuted}
            onToggleMic={onToggleMicrophone}
            onToggleMute={onToggleMute}
            onEndCall={onEndConversation}
          />
        )}
      </div>
    </div>
  );
};

export default VoiceAssistantDisplay;
