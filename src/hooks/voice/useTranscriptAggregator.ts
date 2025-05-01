
import { useCallback, useEffect } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useTranscriptProcessor } from './transcript/useTranscriptProcessor';
import { useTranscriptAccumulator } from './transcript/useTranscriptAccumulator';

/**
 * @deprecated This hook is deprecated in favor of the EventDispatcher system.
 * UserEventHandler is now the primary handler for user speech events.
 * This hook is kept for backward compatibility only.
 */
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
        console.log('[TranscriptAggregator] ⚠️ DEPRECATED - Saving final transcript on cleanup:', finalTranscript.substring(0, 50));
        // Always explicitly set role for cleanup saving
        processTranscript(finalTranscript, 'user');
      }
    };
  }, [getAccumulatedText, processTranscript]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    console.warn('[TranscriptAggregator] ⚠️ DEPRECATED - Use EventDispatcher with UserEventHandler instead');
    
    // CRITICAL FIX: Always determine message role before processing
    // Default to null (require explicit role assignment)
    let role: 'user' | 'assistant' | null = null;
    let transcriptContent: string | null = null;
    
    // Determine role and content based on event type
    if (event.type === 'response.done' || 
        event.type.includes('response.content_part') ||
        (event.type === 'response.delta' && !event.type.includes('audio'))) {
      role = 'assistant';
      
      // Extract content from assistant responses
      if (event.type === 'response.done' && event.response?.content) {
        transcriptContent = event.response.content;
        console.log("[TranscriptAggregator] Assistant response content:", transcriptContent?.substring(0, 50));
      } 
      else if (event.type === 'response.content_part.done' && event.content_part?.text) {
        transcriptContent = event.content_part.text;
        console.log("[TranscriptAggregator] Assistant content part:", transcriptContent?.substring(0, 50));
      }
    }
    // User speech events
    else if (event.type === 'transcript' || 
             event.type.includes('audio_transcript')) {
      role = 'user';
      
      // Extract content from user transcripts
      if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
        transcriptContent = event.transcript;
        console.log("[TranscriptAggregator] User transcript:", transcriptContent?.substring(0, 50));
      }
      else if (event.type === 'response.audio_transcript.done') {
        transcriptContent = event.transcript?.text || event.delta?.text || 
                          (typeof event.transcript === 'string' ? event.transcript : getAccumulatedText());
        console.log("[TranscriptAggregator] User final transcript:", transcriptContent?.substring(0, 50));
      }
    }
    
    // Handle transcript delta events for accumulation (always user)
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      accumulateText(event.delta.text);
    }
    
    // Handle interim transcripts (always user)
    else if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
      accumulateText(event.transcript);
    }
    
    // Handle final transcript and save message
    else if (event.type === 'response.audio_transcript.done' && role === 'user') {
      const transcriptText = event.transcript?.text || event.delta?.text || 
                          (typeof event.transcript === 'string' ? event.transcript : getAccumulatedText());
      
      if (transcriptText && transcriptText.trim()) {
        console.log("[TranscriptAggregator] Processing final user transcript:", transcriptText.substring(0, 50));
        await processTranscript(transcriptText, 'user');
        resetAccumulator();
      }
    }
    
    // Handle assistant responses
    else if ((event.type === 'response.done' || event.type === 'response.content_part.done') && 
             role === 'assistant' && transcriptContent) {
      console.log("[TranscriptAggregator] Processing assistant response:", transcriptContent.substring(0, 50));
      // CRITICAL FIX: Process with explicit assistant role
      await processTranscript(transcriptContent, 'assistant');
    }
  }, [accumulateText, getAccumulatedText, processTranscript, resetAccumulator]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript,
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
