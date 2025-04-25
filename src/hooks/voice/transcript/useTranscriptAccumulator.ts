
import { useState, useCallback } from 'react';
import { TranscriptAccumulator } from '@/utils/chat/transcripts/handlers/TranscriptAccumulator';

export const useTranscriptAccumulator = () => {
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const transcriptAccumulator = new TranscriptAccumulator();
  
  const accumulateText = useCallback((text: string) => {
    transcriptAccumulator.accumulateText(text);
    setAccumulatedTranscript(transcriptAccumulator.getAccumulatedText());
  }, []);

  const getAccumulatedText = useCallback(() => {
    return transcriptAccumulator.getAccumulatedText();
  }, []);

  const reset = useCallback(() => {
    transcriptAccumulator.reset();
    setAccumulatedTranscript('');
  }, []);

  return {
    accumulatedTranscript,
    accumulateText,
    getAccumulatedText,
    reset
  };
};
