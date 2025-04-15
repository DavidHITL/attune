import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useConversation } from '../useConversation';
import { toast } from 'sonner';

export const useTranscriptHandler = () => {
  const { user, conversationId, validateConversationContext } = useConversationValidator();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasTranscript: !!event.transcript || !!(event.transcript?.text),
      hasUser: !!user,
      hasConversationId: !!conversationId,
      timestamp: new Date().toISOString()
    });

    // Only process transcript events when conversation context is valid or we have a message queue
    const hasValidContext = validateConversationContext();
    const hasMessageQueue = !!window.attuneMessageQueue;
    
    if (!hasValidContext && !hasMessageQueue) {
      console.log('⚠️ No valid conversation context or message queue, skipping transcript processing');
      return;
    }
    
    // Handle direct transcript events (highest priority)
    if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
      const transcriptContent = event.transcript;
      console.log("📝 Processing direct transcript with content:", {
        transcriptPreview: transcriptContent.substring(0, 50),
        conversationId,
        hasQueue: hasMessageQueue,
        userId: user?.id
      });
      
      if (hasMessageQueue && !hasValidContext) {
        console.log('🔄 Queueing transcript message until conversation is initialized');
        window.attuneMessageQueue.queueMessage('user', transcriptContent, true);
        
        toast.success("Speech detected", {
          description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
          duration: 3000
        });
        return;
      }

      // Use unified save pathway if we have a valid context
      if (hasValidContext) {
        saveMessage({
          role: 'user' as const,
          content: transcriptContent
        }).then(savedMessage => {
          console.log('Message save result:', savedMessage ? 'Success' : 'Failed');
        }).catch(error => {
          console.error('Error saving transcript:', error);
        });
      }
      return;
    }
    
    // Handle final transcript events
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && event.transcript.text.trim()) {
      const finalTranscript = event.transcript.text;
      console.log("📝 Processing final transcript:", {
        textPreview: finalTranscript.substring(0, 50),
        hasQueue: hasMessageQueue,
        hasValidContext,
        timestamp: new Date().toISOString()
      });
      
      if (hasMessageQueue && !hasValidContext) {
        console.log('🔄 Queueing final transcript message until conversation is initialized');
        window.attuneMessageQueue.queueMessage('user', finalTranscript, true);
        
        toast.success("Speech transcribed", {
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 3000
        });
        return;
      }

      // Use unified save pathway if we have a valid context
      if (hasValidContext) {
        saveMessage({
          role: 'user' as const,
          content: finalTranscript
        }).then(savedMessage => {
          console.log('Final transcript save result:', savedMessage ? 'Success' : 'Failed');
        }).catch(error => {
          console.error('Error saving final transcript:', error);
        });
      }
    }
    
    // Handle partial delta transcripts for accumulation
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      console.log("🔄 Received transcript delta:", event.delta.text);
    }
    
    // Log speech events
    if (event.type === 'input_audio_buffer.speech_started') {
      console.log("🎙️ Speech started event detected");
    }
    
    if (event.type === 'input_audio_buffer.speech_stopped') {
      console.log("🛑 Speech stopped event detected");
    }
  }, [user, conversationId, saveMessage, validateConversationContext]);

  return {
    handleTranscriptEvent
  };
};
