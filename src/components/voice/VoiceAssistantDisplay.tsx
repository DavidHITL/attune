
import React from 'react';
import { useConversation } from '@/hooks/useConversation';
import VoiceActivityIndicator, { VoiceActivityState } from '../VoiceActivityIndicator';
import ConversationHistory from './ConversationHistory';
import StatusIndicator from './StatusIndicator';
import CallControls from './CallControls';
import { Message } from '@/utils/types';
import RippleCirclesCompact from './RippleStyles';
import SmartContext from './SmartContext';
import ConnectedStateContent from './ConnectedStateContent';
import DisconnectedStateContent from './DisconnectedStateContent';

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
  status,
  messages: propMessages,
  messageCount = 0,
  hasContext = false,
  isMicOn = false,
  isMuted = false,
  conversationLoading = false,
  onToggleMicrophone = () => {},
  onToggleMute = () => {},
  onEndConversation = () => {},
  onStartConversation = () => {}
}) => {
  const { messages: hookMessages } = useConversation();
  const messages = propMessages || hookMessages;
  
  return (
    <div className="h-full flex flex-col justify-between items-center overflow-hidden">
      {/* Status indicator at the top */}
      <div className="w-full pt-2">
        <StatusIndicator 
          status={status} 
          isConnected={isConnected} 
          voiceActivityState={voiceActivityState} 
        />
      </div>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isConnected && <RippleCirclesCompact />}
      </div>
      
      {/* Content changes based on connection state */}
      <div className="flex-1 w-full flex flex-col items-center justify-center z-10 pointer-events-none">
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
