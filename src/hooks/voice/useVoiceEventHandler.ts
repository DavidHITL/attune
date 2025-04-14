
import { useCallback } from 'react';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useVoiceChatLogger } from '@/hooks/voice/useVoiceChatLogger';

/**
 * Hook for handling voice and transcript events with enhanced debugging
 */
export const useVoiceEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  
  // Directly import the function to avoid circular dependencies
  const { handleTranscriptEvent } = useTranscriptHandler();
  
  const handleVoiceEvent = useCallback((event: any) => {
    console.log(`🎙️ Voice Event Handler - Event Type: ${event.type}`);
    
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Log speech and transcript events
    logSpeechEvents(event);
    
    // Enhanced transcript event debugging
    if (event.type && (
        event.type === 'transcript' || 
        event.type.includes('audio_transcript') || 
        event.type.includes('speech')
    )) {
      console.log(`📝 Transcript Event [${event.type}]:`, {
        timestamp: new Date().toISOString(),
        hasTranscript: !!event.transcript,
        hasDelta: !!event.delta,
        eventType: event.type
      });
      
      // Log transcript content if present
      const transcriptText = event.transcript || 
                           (event.delta && event.delta.text) || 
                           (event.transcript && event.transcript.text);
                           
      if (transcriptText) {
        console.log(`📄 Transcript Content [${event.type}]: "${transcriptText.substring(0, 100)}"`);
      }
    }
    
    // Enhanced message saving debug logging
    if (chatClientRef.current) {
      console.log('💾 Attempting to save transcript via chatClientRef');
      handleTranscriptEvent(event, (content) => {
        console.log(`💾 Saving message with conversation ID: ${chatClientRef.current?.conversationId}`);
        console.log(`💾 Message content preview: "${content.substring(0, 50)}..."`);
        chatClientRef.current.saveUserMessage(content);
      });
    } else {
      console.warn('⚠️ chatClientRef not available for saving transcript');
    }
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent, chatClientRef]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};

// Import this at the end to avoid circular dependencies
import { useTranscriptHandler } from '@/hooks/voice/useTranscriptHandler';
