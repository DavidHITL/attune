
import { useCallback } from 'react';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

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

    // Use the centralized message save service - single save path
    messageSaveService.saveMessageToDatabase({
      role: messageRole,
      content: transcriptContent
    }).then(() => {
      // Show toast for user feedback
      toast.success(messageRole === 'user' ? "Message saved" : "Response received", {
        description: transcriptContent?.substring(0, 50) + (transcriptContent!.length > 50 ? "..." : ""),
        duration: 3000
      });
    }).catch((error) => {
      console.error("Failed to save message:", error);
    });
    
  }, []);

  return {
    handleTranscriptEvent
  };
};
