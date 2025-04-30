
import { useCallback, useEffect } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useTranscriptProcessor } from './transcript/useTranscriptProcessor';
import { useTranscriptAccumulator } from './transcript/useTranscriptAccumulator';

export const useTranscriptAggregator = () => {
  const { saveMessage } = useConversation();
  const { processTranscript } = useTranscriptProcessor(saveMessage);
  const { 
    accumulatedTranscript, 
    accumulateText, 
    getAccumulatedText, 
    reset: resetAccumulator 
  } = useTranscriptAccumulator();
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      const finalTranscript = getAccumulatedText();
      if (finalTranscript && finalTranscript.trim()) {
        console.log('[TranscriptAggregator] Saving final transcript on cleanup:', finalTranscript.substring(0, 50));
        // Always save final transcript as user since it's from user speech
        processTranscript(finalTranscript, 'user');
      }
    };
  }, [getAccumulatedText, processTranscript]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // Determine message role based on event type - CRITICAL FIX
    let role: 'user' | 'assistant' = 'user'; // Default to user only for transcript events
    
    // Assistant response events
    if (event.type === 'response.done' || 
        event.type.includes('response.content_part') ||
        (event.type === 'response.delta' && !event.type.includes('audio'))) {
      role = 'assistant';
    }
    
    // Handle transcript delta events for accumulation (always user)
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      accumulateText(event.delta.text);
    }
    
    // Handle interim transcripts (always user)
    else if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
      accumulateText(event.transcript);
    }
    
    // Handle final transcript and save message (always user)
    else if (event.type === 'response.audio_transcript.done') {
      const transcriptText = event.transcript?.text || event.delta?.text || 
                           (typeof event.transcript === 'string' ? event.transcript : getAccumulatedText());
      
      if (transcriptText && transcriptText.trim()) {
        await processTranscript(transcriptText, 'user'); // Always user for transcripts
        resetAccumulator();
      }
    }
    
    // Handle assistant responses - CRITICAL FIX: Explicitly set role to assistant
    else if ((event.type === 'response.done' && event.response?.content) || 
             (event.type === 'response.content_part.done' && event.content_part?.text)) {
      const content = event.response?.content || event.content_part?.text;
      if (content && content.trim()) {
        await processTranscript(content, 'assistant'); // Always assistant for responses
      }
    }
  }, [accumulateText, getAccumulatedText, processTranscript, resetAccumulator]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript,
    saveCurrentTranscript: async (role: 'user' | 'assistant' = 'user') => {
      const transcript = getAccumulatedText();
      if (transcript && transcript.trim()) {
        await processTranscript(transcript, role);
        resetAccumulator();
      }
    }
  };
};

