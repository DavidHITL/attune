
import React from 'react';
import { useConversation } from '@/hooks/useConversation';
import VoiceActivityIndicator, { VoiceActivityState } from '../VoiceActivityIndicator';
import RippleCirclesCompact from './RippleStyles';
import CallControls from './CallControls';
import { Message } from '@/utils/types';
import ConnectedStateContent from './ConnectedStateContent';
import DisconnectedStateContent from './DisconnectedStateContent';
import AttuneLogo from '@/components/AttuneLogo';
import { AlertCircle } from 'lucide-react';

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
  connectionError?: string | null;
  onToggleMicrophone?: () => void;
  onToggleMute?: () => void;
  onEndConversation?: () => void;
  onStartConversation?: () => void;
  currentVoice?: string;
  isStartDisabled?: boolean;
}

const VoiceAssistantDisplay: React.FC<VoiceAssistantDisplayProps> = ({ 
  voiceActivityState, 
  isConnected,
  isMuted = false,
  connectionError,
  onToggleMute = () => {},
  onEndConversation = () => {},
  onStartConversation = () => {},
  currentVoice = '',
  isStartDisabled = false
}) => {
  const { messages: hookMessages } = useConversation();
  
  return (
    <div className="h-full flex flex-col justify-between items-center overflow-hidden">
      {/* Logo positioned at the top, consistent with home page */}
      <div className="w-full py-12 z-10">
        <div className="flex justify-center">
          <AttuneLogo />
        </div>
      </div>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isConnected && <RippleCirclesCompact />}
      </div>
      
      {/* Content changes based on connection state */}
      <div className="flex-1 w-full flex flex-col items-center justify-center z-10 pointer-events-none">
        {isConnected ? (
          <ConnectedStateContent minutesLeft={30} />
        ) : (
          <DisconnectedStateContent 
            errorMessage={connectionError ? (
              <div className="flex items-center space-x-2 text-red-400 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error: {connectionError}</span>
              </div>
            ) : null} 
          />
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
          disabled={!!connectionError || isStartDisabled}
        />
      </div>
    </div>
  );
};

export default VoiceAssistantDisplay;
