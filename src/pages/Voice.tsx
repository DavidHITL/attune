import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import RealtimeChat from '@/components/RealtimeChat';
import { useAuth } from '@/context/AuthContext';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import AttuneLogo from '@/components/AttuneLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversation } from '@/hooks/useConversation';
import { toast } from 'sonner';
import { initializeMessageQueue } from '@/utils/chat/messageQueue/QueueProvider';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';
// Keep import but don't use it for automatic initialization
import { getOrCreateConversationId } from '@/hooks/useConversationId';

const Voice = () => {
  const { user, loading: authLoading } = useAuth();
  const { setBackgroundColor } = useBackground();
  const { loading: conversationLoading, conversationId, saveMessage } = useConversation();
  const initializationDoneRef = useRef(false);

  // Set background color
  useEffect(() => {
    setBackgroundColor(BACKGROUND_COLORS.VOICE_BLUE);
  }, [setBackgroundColor]);

  // CRITICAL CHANGE: DISABLED early conversation initialization
  // The previous effect that called getOrCreateConversationId on page load has been removed
  // Conversation ID will now only be created when explicitly needed (e.g., when a call starts)
  // This prevents creating unnecessary conversations on page load

  // Initialize the message queue and connect it to the message save service
  useEffect(() => {
    if (!authLoading && saveMessage) {
      console.log('Initializing message queue with save message function');
      
      // Initialize the MessageQueue with our saveMessage function
      const queue = initializeMessageQueue(saveMessage);
      
      console.log('MessageQueue initialized and connected to MessageSaveService');
    }
  }, [authLoading, saveMessage]);

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
            <RealtimeChat />
          )}
        </div>
      </div>
    </div>
  );
};

export default Voice;
