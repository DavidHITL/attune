
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useConversation } from '../useConversation';
import { toast } from 'sonner';

export const useTranscriptHandler = () => {
  const { user, conversationId, validateConversationContext } = useConversationValidator();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasTranscript: !!event.transcript || !!(event.transcript?.text),
      hasUser: !!user,
      hasConversationId: !!conversationId,
      timestamp: new Date().toISOString()
    });
    
    // Handle direct transcript events (highest priority)
    if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
      console.log("📝 Processing direct transcript with content:", {
        transcriptPreview: event.transcript.substring(0, 50),
        conversationId,
        userId: user?.id
      });
      
      toast.success("Speech detected", {
        description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
        duration: 3000
      });
      
      // Use unified save pathway
      saveMessage({
        role: 'user' as const,
        content: event.transcript
      });
      return;
    }
    
    // Handle final transcript events
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && event.transcript.text.trim()) {
      console.log("📝 Processing final transcript:", {
        textPreview: event.transcript.text.substring(0, 50),
        timestamp: new Date().toISOString()
      });
      
      toast.success("Speech transcribed", {
        description: event.transcript.text.substring(0, 50) + (event.transcript.text.length > 50 ? "..." : ""),
        duration: 3000
      });
      
      // Use unified save pathway
      saveMessage({
        role: 'user' as const,
        content: event.transcript.text
      });
    }
    
    // Handle partial delta transcripts for accumulation
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      console.log("🔄 Received transcript delta:", event.delta.text);
    }
    
    // Log speech events
    if (event.type === 'input_audio_buffer.speech_started') {
      console.log("🎙️ Speech started event detected");
    }
    
    if (event.type === 'input_audio_buffer.speech_stopped') {
      console.log("🛑 Speech stopped event detected");
    }
  }, [user, conversationId, saveMessage]);

  return {
    handleTranscriptEvent
  };
};
