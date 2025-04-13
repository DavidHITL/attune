
import React from 'react';
import { useConversation } from '@/hooks/useConversation';
import VoiceActivityIndicator, { VoiceActivityState } from '../VoiceActivityIndicator';
import ConversationHistory from './ConversationHistory';
import { RippleCirclesCompact } from './RippleStyles';
import SmartContext from './SmartContext';
import { Message } from '@/utils/types';

type VoiceAssistantDisplayProps = {
  status: string;
  isConnected: boolean;
  voiceActivityState: VoiceActivityState;
  messages?: Message[]; // Make this optional or use the hook's messages
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
  // Add other props with defaults
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
  // Use prop messages if provided, otherwise use messages from hook
  const messages = propMessages || hookMessages;
  
  return (
    <div className="relative flex flex-col justify-start items-center pt-4 w-full h-full overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <RippleCirclesCompact />
      </div>
      
      {/* Voice activity indicator overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <VoiceActivityIndicator 
          state={voiceActivityState}
          isVisible={isConnected} // Fix the prop name to match component expectations
        />
      </div>
      
      {/* Conversation UI */}
      <div className="relative z-10 flex flex-col w-full max-w-xl h-full overflow-hidden">
        {messages.length > 50 && <SmartContext />}
        <ConversationHistory messages={messages} />
      </div>
    </div>
  );
};

export default VoiceAssistantDisplay;
