
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useTranscriptSaver } from './transcript/useTranscriptSaver';
import { useConversation } from '../useConversation';

export const useTranscriptHandler = () => {
  const { user, conversationId } = useConversationValidator();
  const { saveTranscript } = useTranscriptSaver();
  const { saveMessage } = useConversation();

  const handleTranscriptEvent = useCallback((event: any, saveUserMessage?: (content: string) => void) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasTranscript: !!event.transcript || !!(event.transcript?.text),
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
      
      // Direct save approach to ensure transcript is saved
      if (saveUserMessage) {
        console.log("💾 Using direct saveUserMessage for transcript");
        saveUserMessage(event.transcript);
      }
      
      // Also try the secondary save approach
      saveTranscript(event.transcript, (msg) => saveMessage({
        role: 'user' as const,
        content: msg.content
      }));
    }
    
    // Handle response.audio_transcript.done events
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && event.transcript.text.trim()) {
      console.log("📝 Processing final transcript:", {
        preview: event.transcript.text.substring(0, 50),
        timestamp: new Date().toISOString()
      });
      
      // Direct save approach to ensure transcript is saved
      if (saveUserMessage) {
        console.log("💾 Using direct saveUserMessage for final transcript");
        saveUserMessage(event.transcript.text);
      }
      
      // Also try the secondary save approach
      saveTranscript(event.transcript.text, (msg) => saveMessage({
        role: 'user' as const,
        content: msg.content
      }));
    }
  }, [user, conversationId, saveTranscript, saveMessage]);

  return {
    handleTranscriptEvent
  };
};
