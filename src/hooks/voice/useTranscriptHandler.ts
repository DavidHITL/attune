
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useTranscriptSaver } from './transcript/useTranscriptSaver';
import { useConversation } from '../useConversation';
import { toast } from 'sonner';

export const useTranscriptHandler = () => {
  const { user, conversationId, validateConversationContext } = useConversationValidator();
  const { saveTranscript } = useTranscriptSaver();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasTranscript: !!event.transcript || !!(event.transcript?.text),
      hasUser: !!user,
      hasConversationId: !!conversationId,
      timestamp: new Date().toISOString()
    });
    
    // IMPORTANT: Allow anonymous users to continue without validation
    // We'll try to save the message even if there's no user or conversation ID
    const shouldContinue = validateConversationContext() || !user;
    
    if (!shouldContinue) {
      console.error("❌ Cannot process transcript: Invalid conversation context", {
        userId: user?.id,
        conversationId
      });
      return;
    }
    
    // CRITICAL FIX: Direct transcript handling
    if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
      console.log("📝 Processing direct transcript with content:", {
        transcriptPreview: event.transcript.substring(0, 50),
        conversationId,
        userId: user?.id
      });
      
      // Explicitly ensure we have valid transcript content
      if (!event.transcript.trim()) {
        console.warn("⚠️ Empty direct transcript received, skipping");
        return;
      }
      
      // Notification for user feedback
      toast.success("Speech detected", {
        description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
        duration: 3000
      });
      
      // Try to save message even for anonymous users
      saveMessage({
        role: 'user' as const,
        content: event.transcript
      }).then(msg => {
        if (msg?.id) {
          console.log("✅ Successfully saved direct transcript with ID:", msg.id);
        } else {
          console.warn("👤 Anonymous user or message not saved to database");
        }
      }).catch(error => {
        console.error("❌ Error saving direct transcript:", error);
      });
      
      return; // Exit after handling direct transcript
    }
    
    // CRITICAL FIX: Final transcript handling  
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && event.transcript.text.trim()) {
      console.log("📝 Processing final transcript:", {
        textPreview: event.transcript.text.substring(0, 50),
        timestamp: new Date().toISOString()
      });
      
      // Explicitly log the full transcript content for debugging
      console.log("📄 FINAL TRANSCRIPT CONTENT:", event.transcript.text);
      
      // Notification for user feedback
      toast.success("Speech transcribed", {
        description: event.transcript.text.substring(0, 50) + (event.transcript.text.length > 50 ? "..." : ""),
        duration: 3000
      });
      
      // Try to save message even for anonymous users
      saveMessage({
        role: 'user' as const,
        content: event.transcript.text
      }).then(msg => {
        if (msg?.id) {
          console.log("✅ Successfully saved final transcript with ID:", msg.id);
        } else {
          console.warn("👤 Anonymous user or message not saved to database");
        }
      }).catch(error => {
        console.error("❌ Error saving final transcript:", error);
      });
    }
    
    // Handle partial delta transcripts for accumulation
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      console.log("🔄 Received transcript delta:", event.delta.text);
      // No direct saving here, just log for debugging
    }
    
    // Handle speech started/stopped events for debugging
    if (event.type === 'input_audio_buffer.speech_started') {
      console.log("🎙️ Speech started event detected");
    }
    
    if (event.type === 'input_audio_buffer.speech_stopped') {
      console.log("🛑 Speech stopped event detected");
    }
    
  }, [user, conversationId, saveMessage, validateConversationContext]);

  return {
    handleTranscriptEvent
  };
};
