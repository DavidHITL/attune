
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useTranscriptSaver } from './transcript/useTranscriptSaver';

export const useTranscriptHandler = () => {
  const { user, conversationId } = useConversationValidator();
  const { saveTranscript } = useTranscriptSaver();

  const handleTranscriptEvent = useCallback((event: any, saveUserMessage?: (content: string) => void) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasUser: !!user,
      hasConversationId: !!conversationId,
      timestamp: new Date().toISOString()
    });
    
    // Handle transcript events for user messages
    if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      console.log("📝 Processing direct transcript event:", {
        timestamp: new Date().toISOString(),
        contentPreview: event.transcript.substring(0, 50),
        conversationId,
        userId: user?.id
      });
      
      saveTranscript(event.transcript, saveMessage, saveUserMessage);
    }
    
    // Handle response.audio_transcript.done events
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && event.transcript.text.trim()) {
      console.log("📝 Processing final transcript:", {
        preview: event.transcript.text.substring(0, 50),
        timestamp: new Date().toISOString()
      });
      
      saveTranscript(event.transcript.text, saveMessage, saveUserMessage);
    }
  }, [user, conversationId, saveTranscript]);

  return {
    handleTranscriptEvent
  };
};

