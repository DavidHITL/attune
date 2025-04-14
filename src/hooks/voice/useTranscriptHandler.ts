
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useTranscriptSaver } from './transcript/useTranscriptSaver';
import { useConversation } from '../useConversation';

export const useTranscriptHandler = () => {
  const { user, conversationId } = useConversationValidator();
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
    
    // Handle direct transcripts
    if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      console.log("📝 Processing direct transcript:", {
        contentPreview: event.transcript.substring(0, 50),
        conversationId,
        userId: user?.id
      });
      
      saveMessage({
        role: 'user' as const,
        content: event.transcript
      });
    }
    
    // Handle final transcripts
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && event.transcript.text.trim()) {
      console.log("📝 Processing final transcript:", {
        preview: event.transcript.text.substring(0, 50),
        timestamp: new Date().toISOString()
      });
      
      saveMessage({
        role: 'user' as const,
        content: event.transcript.text
      });
    }
  }, [user, conversationId, saveMessage]);

  return {
    handleTranscriptEvent
  };
};
