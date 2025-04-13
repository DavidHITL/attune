
import React from 'react';
import { useConversation } from '@/hooks/useConversation';
import VoiceActivityIndicator from '../VoiceActivityIndicator';
import ConversationHistory from './ConversationHistory';
import { RippleCirclesCompact } from './RippleStyles';
import SmartContext from './SmartContext';

type VoiceAssistantDisplayProps = {
  voiceActivityState: string;
  isConnected: boolean;
}

const VoiceAssistantDisplay: React.FC<VoiceAssistantDisplayProps> = ({ 
  voiceActivityState, 
  isConnected
}) => {
  const { messages } = useConversation();
  
  return (
    <div className="relative flex flex-col justify-start items-center pt-4 w-full h-full overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <RippleCirclesCompact />
      </div>
      
      {/* Voice activity indicator overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <VoiceActivityIndicator 
          state={voiceActivityState}
          visible={isConnected}
        />
      </div>
      
      {/* Conversation UI */}
      <div className="relative z-10 flex flex-col w-full max-w-xl h-full overflow-hidden">
        {messages.length > 50 && <SmartContext />}
        <ConversationHistory />
      </div>
    </div>
  );
};

export default VoiceAssistantDisplay;
