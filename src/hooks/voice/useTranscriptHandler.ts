
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useConversation } from '../useConversation';
import { toast } from 'sonner';

export const useTranscriptHandler = () => {
  const { validateConversationContext } = useConversationValidator();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasTranscript: !!event.transcript || !!(event.transcript?.text),
      timestamp: new Date().toISOString()
    });

    // FIX: Improved transcript extraction by checking different event formats
    let transcriptContent: string | null = null;
    
    // Check different possible formats for transcript content
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      console.log("📝 Found direct transcript string:", transcriptContent.substring(0, 50));
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
      console.log("📝 Found transcript in audio_transcript.done event:", transcriptContent.substring(0, 50));
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
      console.log("📝 Found transcript in audio_transcript.done delta:", transcriptContent.substring(0, 50));
    }
    else if (event.type === 'response.done' && event.response?.output?.[0]?.content?.[0]?.transcript) {
      transcriptContent = event.response.output[0].content[0].transcript;
      console.log("📝 Found transcript in response.done event:", transcriptContent.substring(0, 50));
    }
    
    // Skip processing if no valid transcript was found
    if (!transcriptContent || transcriptContent.trim() === '') {
      if (event.type === 'response.audio_transcript.done' || event.type === 'transcript') {
        console.log("⚠️ No valid transcript found in event", event.type);
      }
      return;
    }

    // Only process transcript events when conversation context is valid or we have a message queue
    const hasValidContext = validateConversationContext();
    const hasMessageQueue = typeof window !== 'undefined' && !!window.attuneMessageQueue;
    
    if (!hasValidContext && !hasMessageQueue) {
      console.log('⚠️ No valid conversation context or message queue, skipping transcript processing');
      return;
    }
    
    // Process the transcript content we found
    console.log("📝 Processing transcript content:", {
      transcriptPreview: transcriptContent.substring(0, 50),
      length: transcriptContent.length
    });
      
    if (hasMessageQueue) {
      console.log('🔄 Queueing transcript message');
      // Use optional chaining to safely access the queueMessage method
      window.attuneMessageQueue?.queueMessage('user', transcriptContent, true);
      
      toast.success("Speech detected", {
        description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
        duration: 3000
      });
      return;
    }

    // Use unified save pathway if we have a valid context
    if (hasValidContext) {
      console.log('💾 Saving transcript via direct save');
      saveMessage({
        role: 'user' as const,
        content: transcriptContent
      }).then(savedMessage => {
        console.log('Message save result:', savedMessage ? 'Success' : 'Failed');
      }).catch(error => {
        console.error('Error saving transcript:', error);
      });
    }
  }, [validateConversationContext, saveMessage]);

  return {
    handleTranscriptEvent
  };
};
