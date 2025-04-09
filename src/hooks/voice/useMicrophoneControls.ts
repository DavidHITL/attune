
import { useState, useCallback } from 'react';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { toast } from '@/components/ui/use-toast';

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
        } else {
          chatClientRef.current.resumeMicrophone();
        }
      }
    }
  }, [isConnected, isMicOn, startConversation, chatClientRef]);

  const toggleMute = useCallback(() => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    if (chatClientRef.current) {
      // First, toggle the audio output mute state
      chatClientRef.current.setMuted(newMuteState);
      
      // Now properly handle microphone state when muting
      if (newMuteState) {
        // When muting, always pause the microphone regardless of current mic state
        chatClientRef.current.pauseMicrophone();
        console.log("Muted: Pausing microphone input");
      } else if (isMicOn) {
        // When unmuting, only resume the microphone if it was previously on
        chatClientRef.current.resumeMicrophone();
        console.log("Unmuted: Resuming microphone input because mic was on");
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
