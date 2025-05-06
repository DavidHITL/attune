
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RealtimeChat } from '@/utils/chat/RealtimeChat';
import { useConnectionManager } from './useConnectionManager';
import { useMessageEventHandler } from './useMessageEventHandler';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useConversation } from '../useConversation';
import { VoicePlayer } from '@/utils/audio/VoicePlayer';
import { toast } from 'sonner';

export const useChatClient = () => {
  const { saveMessage } = useConversation();
  const chatClientRef = useRef<RealtimeChat | null>(null);
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [voiceActivityState, setVoiceActivityState] = useState<VoiceActivityState>(VoiceActivityState.Idle);
  const [connectionInProgress, setConnectionInProgress] = useState(false);

  // Use our custom message handler from useMessageEventHandler
  const {
    status,
    setStatus,
    combinedMessageHandler
  } = useMessageEventHandler();

  // Use our connection manager hook
  const {
    startConversation,
    endConversation
  } = useConnectionManager(
    chatClientRef, 
    combinedMessageHandler,
    setStatus, 
    saveMessage,
    setIsConnected,
    setIsMicOn,
    setVoiceActivityState,
    setConnectionError
  );

  // Enhanced start conversation function with retry logic
  const handleStartConversation = useCallback(async () => {
    if (connectionInProgress) {
      console.log("[useChatClient] Connection already in progress, ignoring duplicate request");
      return;
    }
    
    setConnectionInProgress(true);
    setConnectionError(null);
    
    try {
      // Start the conversation
      console.log("[useChatClient] Starting conversation");
      await startConversation();
      
      // Play a test tone to ensure audio is working
      console.log("[useChatClient] Playing audio test tone");
      VoicePlayer.testAudioOutput();
      
      // For debugging - log after 3 seconds to check if session config was sent
      setTimeout(() => {
        if (chatClientRef.current && 
            typeof chatClientRef.current.getWebRTCConnection === 'function' && 
            typeof chatClientRef.current.getWebRTCConnection().hasSessionConfigBeenSent === 'function') {
          
          const sessionConfigSent = chatClientRef.current.getWebRTCConnection().hasSessionConfigBeenSent();
          console.log("[useChatClient] Session config sent status:", sessionConfigSent);
          
          // If session config wasn't sent, try to force send it
          if (!sessionConfigSent) {
            console.log("[useChatClient] Session config not sent, forcing send");
            chatClientRef.current.getWebRTCConnection().forceSendSessionConfig();
          }
        }
      }, 3000);
      
    } catch (error) {
      console.error("[useChatClient] Failed to start conversation:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to start conversation");
      
      // Ensure cleanup on error
      if (chatClientRef.current) {
        endConversation();
      }
    } finally {
      setConnectionInProgress(false);
    }
  }, [startConversation, endConversation, connectionInProgress]);

  // Toggle mute status
  const toggleMute = useCallback(() => {
    if (chatClientRef.current) {
      const newMuteState = !isMuted;
      chatClientRef.current.setMuted(newMuteState);
      setIsMuted(newMuteState);
      
      if (newMuteState) {
        toast.info("Microphone muted");
      } else {
        toast.info("Microphone unmuted");
      }
    }
  }, [isMuted]);

  // Ensure proper cleanup on unmount
  useEffect(() => {
    return () => {
      if (chatClientRef.current) {
        console.log("[useChatClient] Cleaning up on unmount");
        endConversation();
      }
    };
  }, [endConversation]);

  return {
    status,
    isConnected,
    isMicOn,
    isMuted,
    voiceActivityState,
    connectionError,
    startConversation: handleStartConversation,
    endConversation,
    toggleMute,
    connectionInProgress
  };
};
