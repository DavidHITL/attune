
/**
 * Handler specifically for user transcript events
 */
import { MessageQueue } from '../../messageQueue';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { toast } from 'sonner';

export class UserEventHandler {
  private lastTranscriptContent: string = '';
  private accumulatedDeltaContent: string = '';
  private lastProcessedTimestamp: number = 0;
  
  constructor(private messageQueue: MessageQueue) {
    console.log('[UserEventHandler] Initialized');
  }
  
  handleEvent(event: any): void {
    console.log(`[UserEventHandler] Processing user event: ${event.type}`);
    
    // Verify this is actually a user event
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[UserEventHandler] Event ${event.type} is not a user event, skipping`);
      return;
    }
    
    // Always force the correct role for any messages saved here
    const forcedRole = 'user';
    
    let transcriptContent: string | null = null;
    let isDelta = false;
    
    // Extract content based on event type
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      console.log(`[UserEventHandler] Direct transcript: "${transcriptContent.substring(0, 50)}..."`, {
        length: transcriptContent.length,
        timestamp: new Date().toISOString(),
        forcedRole: forcedRole
      });
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
      console.log(`[UserEventHandler] Final transcript: "${transcriptContent.substring(0, 50)}..."`, {
        length: transcriptContent.length,
        timestamp: new Date().toISOString(),
        forcedRole: forcedRole
      });
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
      console.log(`[UserEventHandler] Final delta transcript: "${transcriptContent.substring(0, 50)}..."`, {
        length: transcriptContent.length,
        timestamp: new Date().toISOString(),
        forcedRole: forcedRole
      });
    }
    else if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      // Accumulate delta content instead of saving immediately
      this.accumulatedDeltaContent += event.delta.text;
      isDelta = true;
      console.log(`[UserEventHandler] Accumulating delta: "${event.delta.text}" (total: ${this.accumulatedDeltaContent.length} chars)`);
      
      // Only process accumulated deltas if enough time has passed
      const now = Date.now();
      if (now - this.lastProcessedTimestamp > 2000 && this.accumulatedDeltaContent.trim() !== '') {
        transcriptContent = this.accumulatedDeltaContent;
        this.lastProcessedTimestamp = now;
        console.log(`[UserEventHandler] Processing accumulated deltas: "${transcriptContent.substring(0, 50)}..."`);
      } else {
        // Wait for more deltas or the "done" event
        return;
      }
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
    
    console.log(`[UserEventHandler] Saving USER transcript: "${transcriptContent.substring(0, 50)}..."`, {
      contentLength: transcriptContent.length,
      timestamp: new Date().toISOString(),
      forcedRole: forcedRole
    });
    
    // Add message to queue - always explicitly use 'user' role
    this.messageQueue.queueMessage(forcedRole, transcriptContent, true);
    
    // Show notification for user feedback
    toast.success("Speech detected", { 
      description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
      duration: 2000
    });
    
    // Reset accumulated content if this was final or we just processed accumulated deltas
    if (!isDelta || transcriptContent === this.accumulatedDeltaContent) {
      this.accumulatedDeltaContent = '';
    }
  }
  
  flushAccumulatedTranscript(): void {
    if (this.accumulatedDeltaContent && this.accumulatedDeltaContent.trim() !== '') {
      console.log(`[UserEventHandler] Flushing accumulated transcript: "${this.accumulatedDeltaContent.substring(0, 50)}..."`);
      this.messageQueue.queueMessage('user', this.accumulatedDeltaContent, true);
      this.lastTranscriptContent = this.accumulatedDeltaContent;
      this.accumulatedDeltaContent = '';
    }
  }
}
