
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
      // Directly set mute state on the chat client
      chatClientRef.current.setMuted(newMuteState);
      
      if (newMuteState) {
        // When muting, completely stop the microphone at device level
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            // Completely stop all tracks to properly release the microphone
            stream.getTracks().forEach(track => {
              track.stop();
              console.log("[useMicrophoneControls] Track stopped:", track.label);
            });
          })
          .catch(err => console.error("[useMicrophoneControls] Error accessing mic during muting:", err));
        
        // Force the chat client to stop the microphone as well
        chatClientRef.current.forceStopMicrophone();
        toast.info("Microphone completely deactivated");
        console.log("[useMicrophoneControls] Microphone completely deactivated at device level");
      } else {
        // When unmuting, we need to reinitialize the microphone if the mic was previously on
        toast.info("Microphone activated");
        if (isMicOn) {
          chatClientRef.current.forceResumeMicrophone();
          console.log("[useMicrophoneControls] Microphone reactivated at device level");
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
