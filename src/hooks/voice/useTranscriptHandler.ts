
import { useCallback } from 'react';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { toast } from 'sonner';
import { getMessageQueue } from '@/utils/chat/messageQueue/QueueProvider';

export const useTranscriptHandler = () => {
  const handleTranscriptEvent = useCallback((event: any) => {
    // Get role directly from event type registry or explicit role
    const messageRole = event.explicitRole || EventTypeRegistry.getRoleForEvent(event.type);
    
    // Skip if no valid role determined
    if (!messageRole || (messageRole !== 'user' && messageRole !== 'assistant')) {
      return;
    }

    let transcriptContent: string | null = null;
    
    // Extract content from various event formats
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
    }
    else if (event.type === 'response.done' && event.response?.content) {
      transcriptContent = event.response.content;
    }
    else if (event.type === 'response.content_part.done' && event.content_part?.text) {
      transcriptContent = event.content_part.text;
    }
    
    // Skip processing if no valid content was found
    if (!transcriptContent || transcriptContent.trim() === '') {
      return;
    }

    // First try to use the centralized message queue
    const messageQueue = getMessageQueue();
    if (messageQueue) {
      console.log(`[useTranscriptHandler] Using message queue for ${messageRole} message`);
      messageQueue.queueMessage(messageRole, transcriptContent, true);
      
      // Show toast for user feedback
      toast.success(messageRole === 'user' ? "Message queued" : "Response queued", {
        description: transcriptContent?.substring(0, 50) + (transcriptContent!.length > 50 ? "..." : ""),
        duration: 2000
      });
      
      return;
    }
    
    // This code should never run if the centralized approach is working correctly
    // It's kept as a fallback as the last line of defense
    console.error(`[useTranscriptHandler] No message queue available for ${messageRole} message`);
  }, []);

  return {
    handleTranscriptEvent
  };
};
