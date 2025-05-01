
/**
 * Handler specifically for user transcript events
 * This is the PRIMARY handler for processing all user speech events
 */
import { toast } from 'sonner';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { extractTranscriptText } from '../EventTypes';

export class UserEventHandler {
  private lastTranscriptContent: string = '';
  private processedTranscripts: Set<string> = new Set();
  
  constructor(private messageQueue: any) {
    console.log('[UserEventHandler] PRIMARY HANDLER Initialized');
  }
  
  handleEvent(event: any): void {
    // Verify this is actually a user event through the registry
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role !== 'user') {
      return;
    }
    
    console.log(`[UserEventHandler] Processing user event: ${event.type}`);
    
    // Extract transcript content using our utility function
    const transcriptContent = extractTranscriptText(event);
    
    // Skip empty transcripts
    if (!transcriptContent || transcriptContent.trim() === '') {
      console.log(`[UserEventHandler] Empty transcript in ${event.type}, skipping`);
      return;
    }
    
    // Generate a content hash to deduplicate similar transcripts
    const contentHash = this.hashContent(transcriptContent);
    
    // Skip if we've already processed this exact transcript
    if (this.processedTranscripts.has(contentHash)) {
      console.log(`[UserEventHandler] Duplicate transcript hash, skipping`);
      return;
    }
    
    // Add to processed set to prevent duplicates
    this.processedTranscripts.add(contentHash);
    
    // Limit size of processed set to prevent memory leaks
    if (this.processedTranscripts.size > 100) {
      this.processedTranscripts = new Set(
        Array.from(this.processedTranscripts).slice(-50)
      );
    }
    
    // Only process new transcript content to avoid similar duplicates
    if (this.lastTranscriptContent === transcriptContent) {
      console.log(`[UserEventHandler] Duplicate transcript content, skipping`);
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
  
  /**
   * Create a simple hash of content for deduplication
   */
  private hashContent(content: string): string {
    // Take the first N chars and the length as a simple hash
    const prefix = content.substring(0, 30);
    const length = content.length;
    return `${prefix}-${length}`;
  }
}
