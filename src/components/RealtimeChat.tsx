
import React, { useCallback } from 'react';
import { VoiceActivityState } from './VoiceActivityIndicator';
import { useConversation } from '@/hooks/useConversation';
import { useAuth } from '@/context/AuthContext';
import VoiceAssistantDisplay from './voice/VoiceAssistantDisplay';
import { useChatClient } from './voice/useChatClient';

const RealtimeChat: React.FC = () => {
  const { user } = useAuth();
  const { messages, loading: conversationLoading } = useConversation();
  
  const {
    status,
    isConnected,
    voiceActivityState,
    isMicOn,
    isMuted,
    hasContext,
    messageCount,
    startConversation,
    endConversation,
    toggleMicrophone,
    toggleMute
  } = useChatClient();

  // Prevent auto-connecting - only connect when user explicitly requests it
  const handleStartConversation = useCallback(() => {
    if (!isConnected) {
      console.log("User initiated conversation start");
      startConversation();
    }
  }, [isConnected, startConversation]);

  return (
    <VoiceAssistantDisplay
      user={user}
      status={status}
      isConnected={isConnected}
      voiceActivityState={voiceActivityState}
      messages={messages}
      messageCount={messageCount}
      hasContext={hasContext}
      isMicOn={isMicOn}
      isMuted={isMuted}
      conversationLoading={conversationLoading}
      onToggleMicrophone={toggleMicrophone}
      onToggleMute={toggleMute}
      onEndConversation={endConversation}
      onStartConversation={handleStartConversation}
    />
  );
};

export default RealtimeChat;
