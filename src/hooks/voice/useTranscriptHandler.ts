
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useConversation } from '@/hooks/useConversation';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook for handling transcript events from the voice chat
 */
export const useTranscriptHandler = () => {
  const { saveMessage, conversationId } = useConversation();
  const { user } = useAuth();

  const handleTranscriptEvent = useCallback((event: any, saveUserMessage: (content: string) => void) => {
    // Handle transcript events for user messages
    if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      console.log("📝 Received direct transcript event, saving user message:", event.transcript);
      
      // Show toast confirmation for transcript received
      toast.info("User speech detected", {
        description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
        duration: 2000,
      });
      
      if (!user) {
        console.warn("⚠️ Can't save message: No authenticated user");
        toast.error("Sign in to save your messages");
        return;
      }
      
      if (!conversationId) {
        console.warn("⚠️ Can't save message: No conversation ID");
        toast.error("No active conversation");
        return;
      }
      
      // Save user message with high priority
      saveUserMessage(event.transcript);
      
      // Log key information about conversation state
      console.log("Current conversation ID:", conversationId);
    }
    
    // Also handle response.audio_transcript.done events
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && event.transcript.text.trim()) {
      console.log("📝 Final transcript received:", event.transcript.text);
      
      // Show toast with transcript
      toast.info("Final transcript received", {
        description: event.transcript.text.substring(0, 50) + (event.transcript.text.length > 50 ? "..." : ""),
        duration: 2000,
      });
      
      if (user && conversationId) {
        // Make sure the final transcript is also saved
        saveUserMessage(event.transcript.text);
      }
    }
  }, [user, conversationId]);

  return {
    handleTranscriptEvent
  };
};
