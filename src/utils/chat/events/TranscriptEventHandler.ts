
import { EventTypeRegistry } from './EventTypeRegistry';
import { toast } from 'sonner';
import { extractTranscriptText } from './EventTypes';

/**
 * @deprecated This handler is deprecated in favor of UserEventHandler
 * which is integrated with the EventDispatcher system.
 */
export class TranscriptEventHandler {
  private lastTranscriptContent: string = '';
  
  constructor(
    private saveUserMessage: (text: string) => void
  ) {
    console.warn('[TranscriptEventHandler] ⚠️ DEPRECATED - Use UserEventHandler with EventDispatcher instead');
  }
  
  handleTranscriptEvents(event: any): void {
    // Log deprecation warning
    console.warn(`[TranscriptEventHandler] ⚠️ DEPRECATED handler called for event: ${event.type}`);
    
    // Only process user events - verify this is actually a user event
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[TranscriptEventHandler] Not a user event: ${event.type}, skipping`);
      return;
    }
    
    // Ensure we have the 'user' role
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role !== 'user') {
      console.warn(`[TranscriptEventHandler] Expected user role but got: ${role} for event ${event.type}`);
      return;
    }
    
    // Extract transcript text using our utility function
    const transcriptContent = extractTranscriptText(event);
    
    // Skip empty transcripts
    if (!transcriptContent || transcriptContent.trim() === '') {
      console.log(`[TranscriptEventHandler] Empty transcript in ${event.type}, skipping`);
      return;
    }
    
    // Only process new transcript content to avoid duplicates
    if (this.lastTranscriptContent === transcriptContent) {
      console.log(`[TranscriptEventHandler] Duplicate transcript, skipping`);
      return;
    }
    
    this.lastTranscriptContent = transcriptContent;
    
    // Always save user transcript with the user role
    console.log(`[TranscriptEventHandler] Saving USER transcript: "${transcriptContent.substring(0, 50)}..."`);
    
    toast.success("Speech transcribed", { 
      description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
      duration: 2000
    });
    
    // This function is specifically for saving user speech transcripts
    this.saveUserMessage(transcriptContent);
  }
}
