
import { EventTypeRegistry } from './EventTypeRegistry';
import { toast } from 'sonner';

export class TranscriptEventHandler {
  private lastTranscriptContent: string = '';
  
  constructor(
    private saveUserMessage: (text: string) => void
  ) {}
  
  handleTranscriptEvents(event: any): void {
    // IMPORTANT: This handler is now DISABLED to prevent duplicate event processing
    // All transcript events are now handled by the EventDispatcher and routed
    // to either UserEventHandler or AssistantEventHandler
    
    console.log(`[TranscriptEventHandler] DISABLED: Event received but not processed: ${event.type}`);
    return;
    
    // Previous implementation is kept below for reference but won't be executed
    /*
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
        
        // This function is specifically for saving user speech transcripts
        this.saveUserMessage(finalTranscript);
      }
    }
    */
  }
}
