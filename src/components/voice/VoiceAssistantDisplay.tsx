
import React, { useState, useEffect } from 'react';
import { Message } from '@/utils/types';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import AttuneLogo from '@/components/AttuneLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import ConnectedStateContent from './ConnectedStateContent';
import DisconnectedStateContent from './DisconnectedStateContent';
import CallControls from './CallControls';
import RippleStyles from './RippleStyles';

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
  
  return (
    <div className="flex flex-col h-full relative">
      {/* Logo shown in both connected and disconnected states */}
      <div className={`${isConnected ? 'my-4' : 'mb-6'} flex justify-center`}>
        <AttuneLogo />
      </div>
      
      {/* Content container with different layout based on connection status */}
      {isConnected ? (
        <ConnectedStateContent minutesLeft={minutesLeft} />
      ) : (
        <DisconnectedStateContent />
      )}

      {/* Call controls with improved accessibility and visual feedback */}
      <CallControls
        isConnected={isConnected}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onEndConversation={onEndConversation}
        onStartConversation={onStartConversation}
      />
      
      {/* Add ripple effect styles */}
      <RippleStyles />
    </div>
  );
};

export default VoiceAssistantDisplay;
