
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import RealtimeChat from '@/components/RealtimeChat';
import { useAuth } from '@/context/AuthContext';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import AttuneLogo from '@/components/AttuneLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversation } from '@/hooks/useConversation';
import { toast } from 'sonner';
import { useTranscriptAggregator } from '@/hooks/voice/useTranscriptAggregator';

const Voice = () => {
  const { user, loading: authLoading } = useAuth();
  const { setBackgroundColor } = useBackground();
  const { loading: conversationLoading, conversationId } = useConversation();
  const transcriptAggregatorRef = useRef<any>(null);

  // Set background color
  useEffect(() => {
    setBackgroundColor(BACKGROUND_COLORS.VOICE_BLUE);
  }, [setBackgroundColor]);

  // Early conversation initialization for authenticated users
  useEffect(() => {
    const initializeVoiceChat = async () => {
      if (!user) {
        console.log('No authenticated user available for conversation initialization');
        return;
      }

      console.log('Voice chat initialization started', {
        userId: user.id,
        hasConversationId: !!conversationId
      });

      if (conversationLoading) {
        console.log('Waiting for conversation initialization...');
      } else {
        console.log('Conversation initialization complete:', {
          conversationId,
          ready: !conversationLoading && !!conversationId
        });
      }
    };

    initializeVoiceChat();
  }, [user, conversationId, conversationLoading]);

  // Handle page unload to save any pending transcripts
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save any pending transcript when navigating away
      if (transcriptAggregatorRef.current?.saveCurrentTranscript) {
        console.log('Voice page unloading - saving pending transcript');
        // CRITICAL FIX: Always explicitly pass role when saving transcript
        transcriptAggregatorRef.current.saveCurrentTranscript('user');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also try to save transcript when component unmounts
      if (transcriptAggregatorRef.current?.saveCurrentTranscript) {
        console.log('Voice component unmounting - saving pending transcript');
        // CRITICAL FIX: Always explicitly pass role when saving transcript
        transcriptAggregatorRef.current.saveCurrentTranscript('user');
      }
    };
  }, []);

  // Get access to transcript functions from the RealtimeChat component
  const handleTranscriptAggregatorRef = (api: any) => {
    if (api?.saveCurrentTranscript) {
      transcriptAggregatorRef.current = api;
    }
  };

  return (
    <div className="min-h-screen h-screen overflow-hidden relative bg-[#1B4965]">
      <div className="relative z-10 h-full flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-[390px] h-[calc(100vh-120px)] max-h-[calc(100vh-120px)]">
          {authLoading ? (
            <div className="h-full flex flex-col items-center">
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
          ) : (
            <RealtimeChat onTranscriptAggregatorReady={handleTranscriptAggregatorRef} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Voice;
