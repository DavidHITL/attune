
import React from 'react';
import { useConversation } from '@/hooks/useConversation';
import VoiceActivityIndicator, { VoiceActivityState } from '../VoiceActivityIndicator';
import ConversationHistory from './ConversationHistory';
import RippleCirclesCompact from './RippleStyles';
import SmartContext from './SmartContext';
import { Message } from '@/utils/types';

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
    <div className="relative flex flex-col justify-start items-center pt-4 w-full h-full overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <RippleCirclesCompact />
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <VoiceActivityIndicator 
          state={voiceActivityState}
        />
      </div>
      
      <div className="relative z-10 flex flex-col w-full max-w-xl h-full overflow-hidden">
        {messages.length > 50 && <SmartContext />}
        <ConversationHistory messages={messages} />
      </div>
    </div>
  );
};

export default VoiceAssistantDisplay;
