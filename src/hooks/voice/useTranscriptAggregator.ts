
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
        // Always explicitly set role for cleanup saving
        processTranscript(finalTranscript, 'user');
      }
    };
  }, [getAccumulatedText, processTranscript]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // CRITICAL FIX: Always determine message role before processing
    // Default to null (require explicit role assignment)
    let role: 'user' | 'assistant' | null = null;
    let transcriptContent: string | null = null;
    
    // IMPORTANT DEBUG LOGGING - Log the incoming event type and explicit role
    console.log(`🔍 [TranscriptAggregator] Processing event type: ${event.type}, explicitRole: ${event.explicitRole || 'none'}`);
    
    // First check if the event has an explicitly assigned role from EventDispatcher
    if (event.explicitRole === 'assistant' || event.explicitRole === 'user') {
      role = event.explicitRole;
      console.log(`[TranscriptAggregator] Using explicit role from event: ${role}`);
    }
    // If no explicit role, determine based on event type
    else {
      // Determine role and content based on event type
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
      
      console.log(`[TranscriptAggregator] Determined role from event type: ${role || 'undefined'}`);
    }
    
    // CRITICAL CHECK: If we still don't have a role, log and skip processing
    if (!role) {
      console.log(`[TranscriptAggregator] ⚠️ Cannot process event with unknown role: ${event.type}`);
      return;
    }
    
    // Now extract content based on role and event type
    // Assistant responses
    if (role === 'assistant') {
      // Extract content from assistant responses
      if (event.type === 'response.done' && event.response?.content) {
        transcriptContent = event.response.content;
      } 
      else if (event.type === 'response.content_part.done' && event.content_part?.text) {
        transcriptContent = event.content_part.text;
      }
      
      if (transcriptContent) {
        console.log(`[TranscriptAggregator] Assistant content: ${transcriptContent.substring(0, 50)}`);
      }
    }
    // User speech events
    else if (role === 'user') {
      // Extract content from user transcripts
      if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
        transcriptContent = event.transcript;
      }
      else if (event.type === 'response.audio_transcript.done') {
        transcriptContent = event.transcript?.text || event.delta?.text || 
                          (typeof event.transcript === 'string' ? event.transcript : getAccumulatedText());
      }
      
      if (transcriptContent) {
        console.log(`[TranscriptAggregator] User content: ${transcriptContent.substring(0, 50)}`);
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
        console.log(`🔒 [TranscriptAggregator] Saving USER transcript with explicit role 'user'`);
        await processTranscript(transcriptText, 'user');
        resetAccumulator();
      }
    }
    
    // Handle assistant responses
    else if ((event.type === 'response.done' || event.type === 'response.content_part.done') && 
             role === 'assistant' && transcriptContent) {
      console.log(`🔒 [TranscriptAggregator] Saving ASSISTANT transcript with explicit role 'assistant'`);
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
        console.log(`[TranscriptAggregator] Explicitly saving transcript with role: ${role}`);
        await processTranscript(transcript, role);
        resetAccumulator();
      }
    }
  };
};
