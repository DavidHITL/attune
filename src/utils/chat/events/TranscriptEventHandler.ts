
import { EventTypeRegistry } from './EventTypeRegistry';
import { toast } from 'sonner';
import { getMessageQueue } from '../messageQueue/QueueProvider';

export class TranscriptEventHandler {
  private lastTranscriptContent: string = '';
  
  constructor(
    private saveUserMessage: (text: string) => void
  ) {}
  
  handleTranscriptEvents(event: any): void {
    // Verify this is a user event to avoid handling assistant events
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[TranscriptEventHandler] Not a user event: ${event.type}, skipping`);
      return;
    }
    
    // Handle direct transcript events - show feedback but don't save
    if (event.type === "transcript" && event.transcript && event.transcript.trim()) {
      if (this.lastTranscriptContent !== event.transcript) {
        this.lastTranscriptContent = event.transcript;
        
        // Only show toast for interim feedback, don't save messages
        toast.info("Speech detected", { 
          description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
          duration: 2000
        });
      }
    }
    
    // Handle final transcript completion - this is where we save user transcripts
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      if (this.lastTranscriptContent !== finalTranscript && finalTranscript.trim() !== '') {
        this.lastTranscriptContent = finalTranscript;
        
        console.log(`[TranscriptEventHandler] Saving final user transcript: "${finalTranscript.substring(0, 50)}..."`);
        
        toast.success("Speech transcribed", { 
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
        
        // Try to use message queue first, fall back to direct save if not available
        const messageQueue = getMessageQueue();
        if (messageQueue) {
          console.log('[TranscriptEventHandler] Using message queue to save user transcript');
          // CRITICAL FIX: Explicitly set role to 'user' since this is a user transcript handler
          messageQueue.queueMessage('user', finalTranscript, true);
        } else {
          console.log('[TranscriptEventHandler] No message queue available, using direct save');
          // Fall back to direct save method
          this.saveUserMessage(finalTranscript);
        }
      }
    }
  }
}
