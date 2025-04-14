
import React from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useChatClient } from './voice/useChatClient';
import { useCallControls } from '@/hooks/voice/useCallControls';
import VoiceCallUI from './voice/VoiceCallUI';

const RealtimeChat: React.FC = () => {
  // Get conversation state from the useConversation hook
  const { loading: conversationLoading } = useConversation();
  
  // Get chat client functionality
  const {
    status,
    isConnected,
    voiceActivityState,
    isMuted,
    startConversation,
    endConversation,
    toggleMute
  } = useChatClient();

  // Get call control functionality
  const { handleStartCall, handleEndCall } = useCallControls(
    startConversation, 
    endConversation
  );

  return (
    <VoiceCallUI
      isConnected={isConnected}
      voiceActivityState={voiceActivityState}
      isMuted={isMuted}
      conversationLoading={conversationLoading}
      onToggleMute={toggleMute}
      onEndConversation={handleEndCall}
      onStartConversation={handleStartCall}
    />
  );
};

export default RealtimeChat;
