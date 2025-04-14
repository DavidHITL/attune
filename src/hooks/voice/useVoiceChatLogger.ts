
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useConversation } from '@/hooks/useConversation';

/**
 * Hook for handling logging and status notifications in the voice chat
 */
export const useVoiceChatLogger = () => {
  const { user } = useAuth();
  const { conversationId, messages } = useConversation();

  useEffect(() => {
    console.log("Voice page loaded. Auth status:", { 
      userLoggedIn: !!user, 
      userId: user?.id,
      conversationId: conversationId || 'none',
      messageCount: messages.length
    });
    
    if (!user) {
      console.warn("User not authenticated! Messages won't be saved to database.");
      toast.warning("Please log in to save your conversation", { duration: 5000 });
    } else if (!conversationId) {
      console.warn("No active conversation ID! Messages won't be saved to database.");
    } else {
      console.log("Voice chat ready with conversation ID:", conversationId);
      toast.info("Voice chat initialized", { 
        description: `Using conversation: ${conversationId}`,
        duration: 2000
      });
    }
  }, [user, conversationId, messages.length]);

  const logSpeechEvents = useCallback((event: any) => {
    if (event.type?.includes('speech') || event.type?.includes('transcript')) {
      if (event.type === 'input_audio_buffer.speech_started') {
        console.log("🎤 USER SPEECH STARTED - Preparing to capture transcript");
        
        // Show a toast when speech is detected
        toast.info("Speech detected", { duration: 2000 });
      } else if (event.type === 'input_audio_buffer.speech_stopped') {
        console.log("🔇 USER SPEECH STOPPED - Finalizing transcript");
      }
    }
  }, []);

  return { logSpeechEvents };
};
