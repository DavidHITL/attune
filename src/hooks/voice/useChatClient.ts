
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

  // Before returning, try to play a test audio sound
  // This can help wake up audio systems on devices where audio is "sleeping"
  useEffect(() => {
    if (isConnected) {
      // Play a test sound to validate audio is working
      try {
        console.log("[useChatClient] Playing audio test tone");
        VoicePlayer.testAudioOutput();
      } catch (e) {
        console.error("[useChatClient] Audio test failed:", e);
      }
    }
  }, [isConnected]);

  return {
    status,
    isConnected,
    isMicOn,
    isMuted,
    voiceActivityState,
    connectionError,
    startConversation,
    endConversation,
    toggleMute
  };
};
