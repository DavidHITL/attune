
import { useState, useCallback, useEffect } from 'react';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { toast } from 'sonner';

/**
 * Hook for managing microphone and audio output controls
 */
export const useMicrophoneControls = (
  chatClientRef: React.MutableRefObject<RealtimeChatClient | null>,
  isConnected: boolean,
  startConversation: () => Promise<void>
) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Synchronize mic state with chatClient's state
  useEffect(() => {
    if (chatClientRef.current && isConnected) {
      // Set initial state based on current chatClient state
      setIsMicOn(!chatClientRef.current.isMicrophonePaused());
    }
  }, [chatClientRef, isConnected]);

  const toggleMicrophone = useCallback(() => {
    if (!isConnected) {
      startConversation();
    } else {
      const newMicState = !isMicOn;
      setIsMicOn(newMicState);
      if (chatClientRef.current) {
        // Toggle microphone state in the RealtimeAudio utility
        if (!newMicState) {
          chatClientRef.current.pauseMicrophone();
          console.log("[useMicrophoneControls] Mic turned OFF");
        } else {
          chatClientRef.current.resumeMicrophone();
          console.log("[useMicrophoneControls] Mic turned ON");
        }
      }
    }
  }, [isConnected, isMicOn, startConversation, chatClientRef]);

  const toggleMute = useCallback(() => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    if (chatClientRef.current) {
      // Apply the mute state specifically to the microphone input
      console.log(`[useMicrophoneControls] Mute toggled to: ${newMuteState}`);
      
      if (newMuteState) {
        toast.info("Microphone muted");
        // Force stop microphone when muting - this ensures the mic is actually turned off
        chatClientRef.current.forceStopMicrophone();
        console.log("[useMicrophoneControls] Force stopping microphone due to mute");
      } else {
        toast.info("Microphone unmuted");
        // Only resume microphone when unmuting if mic was previously on
        if (isMicOn) {
          chatClientRef.current.forceResumeMicrophone();
          console.log("[useMicrophoneControls] Force resuming microphone after unmute");
        }
      }
    }
  }, [isMuted, chatClientRef, isMicOn]);

  return {
    isMicOn,
    setIsMicOn,
    isMuted,
    setIsMuted,
    toggleMicrophone,
    toggleMute
  };
};
