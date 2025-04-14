
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
  currentVoice?: string;
}

const VoiceAssistantDisplay: React.FC<VoiceAssistantDisplayProps> = ({ 
  voiceActivityState, 
  isConnected,
  isMuted = false,
  onToggleMute = () => {},
  onEndConversation = () => {},
  onStartConversation = () => {},
  currentVoice = ''
}) => {
  const { messages: hookMessages } = useConversation();
  
  // Get a more human-readable voice name for display
  const getVoiceDisplayName = (voice: string) => {
    const voiceMap: Record<string, string> = {
      'alloy': 'Alloy (Neutral)',
      'echo': 'Echo (Male)',
      'sage': 'Sage (Male)',
      'ash': 'Ash (Male)',
      'coral': 'Coral (Female)',
      'shimmer': 'Shimmer (Female)',
      'verse': 'Verse (Female)',
      'ballad': 'Ballad (Male)'
    };
    
    return voiceMap[voice] || voice || 'Default';
  };
  
  return (
    <div className="h-full flex flex-col justify-between items-center overflow-hidden">
      {/* Logo positioned at the top, consistent with home page */}
      <div className="w-full py-12 z-10">
        <div className="flex justify-center">
          <AttuneLogo />
          {currentVoice && (
            <div className="absolute top-2 right-2 text-xs text-white/70 bg-black/20 px-2 py-1 rounded">
              Voice: {getVoiceDisplayName(currentVoice)}
            </div>
          )}
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
