
import React, { useCallback } from 'react';
import { VoiceActivityState } from './VoiceActivityIndicator';
import { useConversation } from '@/hooks/useConversation';
import { useAuth } from '@/context/AuthContext';
import VoiceAssistantDisplay from './voice/VoiceAssistantDisplay';
import { useChatClient } from './voice/useChatClient';
import { BackgroundCircles } from '@/components/ui/background-circles';
import { Skeleton } from '@/components/ui/skeleton';
import AttuneLogo from '@/components/AttuneLogo';

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

  // Show a loading skeleton while conversation data is loading
  if (conversationLoading) {
    return (
      <div className="h-full flex flex-col items-center bg-[#1B4965]">
        <AttuneLogo />
        <div className="flex-1 w-full flex flex-col items-center justify-center mt-8 space-y-4">
          <Skeleton className="h-8 w-3/4 bg-white/10" />
          <Skeleton className="h-24 w-4/5 bg-white/10" />
          <div className="mt-auto mb-16 flex justify-center space-x-6">
            <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
            <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Background animation - only show when connected */}
      {isConnected && (
        <div className="absolute inset-0 z-0 opacity-70 flex items-center justify-center">
          <div className="relative" style={{ marginTop: '180px' }}>
            <BackgroundCircles 
              title=""
              description=""
              variant="septenary"
              className="absolute inset-0"
            />
          </div>
        </div>
      )}
      
      {/* Voice assistant display with improved visibility */}
      <div className="relative z-10 h-full">
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
      </div>
    </>
  );
};

export default RealtimeChat;
