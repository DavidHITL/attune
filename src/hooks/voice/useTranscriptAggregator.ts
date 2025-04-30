
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
        // CRITICAL FIX: Make sure we explicitly set role for cleanup saving
        processTranscript(finalTranscript, 'user');
      }
    };
  }, [getAccumulatedText, processTranscript]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // CRITICAL FIX: Always determine message role before processing
    // Default to null (require explicit role assignment)
    let role: 'user' | 'assistant' | null = null;
    
    // Assistant response events
    if (event.type === 'response.done' || 
        event.type.includes('response.content_part') ||
        (event.type === 'response.delta' && !event.type.includes('audio'))) {
      role = 'assistant';
    }
    // User speech events
    else if (event.type === 'transcript' || 
             event.type.includes('audio_transcript')) {
      role = 'user';
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
        // CRITICAL FIX: Always explicitly set role for user transcripts
        await processTranscript(transcriptText, 'user');
        resetAccumulator();
      }
    }
    
    // Handle assistant responses - CRITICAL FIX: Explicitly set role to assistant
    else if ((event.type === 'response.done' && event.response?.content) || 
             (event.type === 'response.content_part.done' && event.content_part?.text)) {
      const content = event.response?.content || event.content_part?.text;
      if (content && content.trim()) {
        // CRITICAL FIX: Always explicitly set role for assistant responses
        await processTranscript(content, 'assistant');
      }
    }
  }, [accumulateText, getAccumulatedText, processTranscript, resetAccumulator]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript,
    // CRITICAL FIX: Default parameter removed, require explicit role
    saveCurrentTranscript: async (role: 'user' | 'assistant') => {
      if (!role) {
        console.error('[TranscriptAggregator] No role provided to saveCurrentTranscript');
        return;
      }
      
      const transcript = getAccumulatedText();
      if (transcript && transcript.trim()) {
        await processTranscript(transcript, role);
        resetAccumulator();
      }
    }
  };
};
