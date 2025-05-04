
import { useEffect, useCallback } from 'react';
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
    
    // Only show auth warning - don't warn about missing conversationId since this is expected on load
    if (!user) {
      console.warn("User not authenticated! This will affect database persistence.");
      toast.warning("Please log in to save your conversation", { duration: 5000 });
    } else if (process.env.NODE_ENV === 'development') {
      // Only log conversation status in development, not as a warning
      if (conversationId) {
        console.log(`Conversation status: Active with ID: ${conversationId}`);
      } else {
        console.log("Conversation status: Pending initialization (this is normal before call start)");
      }
    }
    
    // Return cleanup function
    return () => {
      toast.dismiss("no-conversation-warning");
    };
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
