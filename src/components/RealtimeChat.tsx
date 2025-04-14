
import React, { useEffect } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useChatClient } from './voice/useChatClient';
import VoiceAssistantDisplay from './voice/VoiceAssistantDisplay';
import { BackgroundCircles } from '@/components/ui/background-circles';
import { Skeleton } from '@/components/ui/skeleton';
import AttuneLogo from '@/components/AttuneLogo';
import { toast } from 'sonner';

const RealtimeChat: React.FC = () => {
  const { messages, loading: conversationLoading, conversationId } = useConversation();
  
  // Get chat client functionality
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

  // Log mount for debugging
  useEffect(() => {
    console.log("RealtimeChat component mounted");
    
    // Check if conversation ID is available
    if (!conversationId) {
      console.warn("Warning: No active conversation ID available on mount");
    } else {
      console.log("Conversation ID available:", conversationId);
    }
    
    return () => console.log("RealtimeChat component unmounted");
  }, [conversationId]);

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

  const handleStartCall = async () => {
    console.log("Start call button clicked");
    try {
      await startConversation();
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start call. Please try again.");
    }
  };

  const handleEndCall = () => {
    console.log("End call button clicked");
    endConversation();
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Background animation - only show when connected */}
      {isConnected && (
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
          <BackgroundCircles 
            title=""
            description=""
            variant="septenary"
            className="absolute inset-0"
          />
        </div>
      )}
      
      {/* Voice assistant display */}
      <div className="relative z-10 h-full">
        <VoiceAssistantDisplay
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
          onEndConversation={handleEndCall}
          onStartConversation={handleStartCall}
        />
      </div>
    </div>
  );
};

export default RealtimeChat;
