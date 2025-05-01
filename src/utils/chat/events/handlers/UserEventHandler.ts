
/**
 * Handler specifically for user transcript events
 */
import { MessageQueue } from '../../messageQueue';
import { toast } from 'sonner';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { extractTranscriptText } from '../EventTypes';

export class UserEventHandler {
  private lastTranscriptContent: string = '';
  
  constructor(private messageQueue: any) {
    console.log('[UserEventHandler] Initialized');
  }
  
  handleEvent(event: any): void {
    console.log(`[UserEventHandler] Processing user event: ${event.type}`);
    
    // Verify this is actually a user event through the registry
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role !== 'user') {
      console.warn(`[UserEventHandler] Received non-user event: ${event.type}, role: ${role}`);
      return;
    }
    
    // Extract transcript content using our utility function
    const transcriptContent = extractTranscriptText(event);
    
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
    
    // Always save user transcript with the user role
    console.log(`[UserEventHandler] Saving USER transcript: "${transcriptContent.substring(0, 50)}..."`);
    
    // Check if the message queue has the expected interface
    if (typeof this.messageQueue.queueMessage === 'function') {
      this.messageQueue.queueMessage('user', transcriptContent, true);
      
      // Show notification for user feedback
      toast.success("Speech detected", { 
        description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
        duration: 2000
      });
    } else {
      console.error('[UserEventHandler] Message queue is missing queueMessage method');
    }
  }
}
