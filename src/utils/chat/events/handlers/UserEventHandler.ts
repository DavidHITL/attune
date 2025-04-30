
/**
 * Handler specifically for user transcript events
 */
import { MessageQueue } from '../../messageQueue';
import { toast } from 'sonner';
import { EventTypeRegistry } from '../EventTypeRegistry';

export class UserEventHandler {
  private lastTranscriptContent: string = '';
  
  constructor(private messageQueue: MessageQueue) {}
  
  handleEvent(event: any): void {
    // Double-check that this is actually a user event before proceeding
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      console.warn(`[UserEventHandler] Received non-user event: ${event.type}, ignoring`);
      return;
    }
    
    console.log(`[UserEventHandler] Processing USER event: ${event.type}`);
    
    let transcriptContent: string | null = null;
    
    // Extract content based on event type
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      console.log(`[UserEventHandler] Direct transcript: "${transcriptContent.substring(0, 50)}..."`);
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
      console.log(`[UserEventHandler] Final transcript: "${transcriptContent.substring(0, 50)}..."`);
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
      console.log(`[UserEventHandler] Final delta transcript: "${transcriptContent.substring(0, 50)}..."`);
    }
    
    // Skip empty transcripts
    if (!transcriptContent || transcriptContent.trim() === '') {
      console.log(`[UserEventHandler] Empty transcript in ${event.type}, skipping`);
      return;
    }
    
    // Only process new transcript content to avoid duplicates
    if (this.lastTranscriptContent === transcriptContent) {
      console.log(`[UserEventHandler] Duplicate transcript, skipping`);
      return;
    }
    
    this.lastTranscriptContent = transcriptContent;
    
    // ALWAYS save with explicit user role - this is critical
    console.log(`[UserEventHandler] Saving USER transcript: "${transcriptContent.substring(0, 50)}..."`);
    this.messageQueue.queueMessage('user', transcriptContent, true);
    
    // Show notification for user feedback
    toast.success("Speech detected", { 
      description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
      duration: 2000
    });
  }
}
