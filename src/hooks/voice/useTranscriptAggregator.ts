
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
        processTranscript(finalTranscript, 'user');
      }
    };
  }, [getAccumulatedText, processTranscript]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // Handle transcript delta events for accumulation
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      accumulateText(event.delta.text);
    }
    
    // Handle interim transcripts
    else if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
      accumulateText(event.transcript);
    }
    
    // Handle final transcript and save message
    else if (event.type === 'response.audio_transcript.done') {
      const transcriptText = event.transcript?.text || event.delta?.text || 
                           (typeof event.transcript === 'string' ? event.transcript : getAccumulatedText());
      
      if (transcriptText && transcriptText.trim()) {
        await processTranscript(transcriptText, 'user');
        resetAccumulator();
      }
    }
    
    // Handle assistant responses
    else if ((event.type === 'response.done' && event.response?.content) || 
             (event.type === 'response.content_part.done' && event.content_part?.text)) {
      const content = event.response?.content || event.content_part?.text;
      if (content && content.trim()) {
        await processTranscript(content, 'assistant');
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
