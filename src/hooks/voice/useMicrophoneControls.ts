
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
      setIsMicOn(!isMicOn);
      if (chatClientRef.current) {
        // Toggle microphone state in the RealtimeAudio utility
        if (isMicOn) {
          chatClientRef.current.pauseMicrophone();
        } else {
          chatClientRef.current.resumeMicrophone();
        }
      }
    }
  }, [isConnected, isMicOn, startConversation, chatClientRef]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (chatClientRef.current) {
      // Toggle audio output mute state in the RealtimeAudio utility
      chatClientRef.current.setMuted(!isMuted);
    }
  }, [isMuted, chatClientRef]);

  return {
    isMicOn,
    setIsMicOn,
    isMuted,
    setIsMuted,
    toggleMicrophone,
    toggleMute
  };
};
