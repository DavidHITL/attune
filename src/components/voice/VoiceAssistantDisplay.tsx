
import React from 'react';
import { useConversation } from '@/hooks/useConversation';
import VoiceActivityIndicator, { VoiceActivityState } from '../VoiceActivityIndicator';
import RippleCirclesCompact from './RippleStyles';
import CallControls from './CallControls';
import { Message } from '@/utils/types';
import ConnectedStateContent from './ConnectedStateContent';
import DisconnectedStateContent from './DisconnectedStateContent';
import AttuneLogo from '@/components/AttuneLogo';

type VoiceAssistantDisplayProps = {
  status: string;
  isConnected: boolean;
  voiceActivityState: VoiceActivityState;
  messages?: Message[]; 
  messageCount?: number;
  hasContext?: boolean;
  isMicOn?: boolean;
  isMuted?: boolean;
  conversationLoading?: boolean;
  onToggleMicrophone?: () => void;
  onToggleMute?: () => void;
  onEndConversation?: () => void;
  onStartConversation?: () => void;
}

const VoiceAssistantDisplay: React.FC<VoiceAssistantDisplayProps> = ({ 
  voiceActivityState, 
  isConnected,
  isMuted = false,
  onToggleMute = () => {},
  onEndConversation = () => {},
  onStartConversation = () => {}
}) => {
  const { messages: hookMessages } = useConversation();
  
  return (
    <div className="h-full flex flex-col justify-between items-center overflow-hidden">
      {/* Restore hero logo at the top */}
      <div className="w-full pt-4 z-10">
        <div className="flex justify-center">
          <AttuneLogo />
        </div>
      </div>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isConnected && <RippleCirclesCompact />}
      </div>
      
      {/* Content changes based on connection state */}
      <div className="flex-1 w-full flex flex-col items-center justify-center z-10 pointer-events-none mt-4">
        {isConnected ? (
          <ConnectedStateContent minutesLeft={30} />
        ) : (
          <DisconnectedStateContent />
        )}
      </div>
      
      {/* Call controls at the bottom */}
      <div className="w-full pb-8 z-10 pointer-events-auto">
        <CallControls
          isConnected={isConnected}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onEndConversation={onEndConversation}
          onStartConversation={onStartConversation}
        />
      </div>
    </div>
  );
};

export default VoiceAssistantDisplay;
