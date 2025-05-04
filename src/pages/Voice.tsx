
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

  // CRITICAL CHANGE: Initialize conversation ID as early as possible
  useEffect(() => {
    const initializeEarlyConversation = async () => {
      // Skip if already initialized or still loading auth
      if (initializationDoneRef.current || authLoading || !user) {
        return;
      }
      
      try {
        console.log('Voice early conversation initialization started');
        
        // Get or create conversation ID at component mount
        const conversationId = await getOrCreateConversationId(user.id);
        
        console.log(`Early conversation ID created: ${conversationId}`);
        initializationDoneRef.current = true;
        
        // Store globally for immediate use by message savers
        if (typeof window !== 'undefined') {
          window.__attuneConversationId = conversationId;
          
          // Notify components that might be waiting
          document.dispatchEvent(new CustomEvent('conversationIdReady', { 
            detail: { conversationId } 
          }));
        }
      } catch (error) {
        console.error('Error during early conversation initialization:', error);
      }
    };

    // Run initialization when user is available
    if (user && !authLoading) {
      initializeEarlyConversation();
    }
  }, [user, authLoading]);

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
