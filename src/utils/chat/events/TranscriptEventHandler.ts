
import { EventTypeRegistry } from './EventTypeRegistry';
import { toast } from 'sonner';
import { getMessageQueue } from '../messageQueue/QueueProvider';

export class TranscriptEventHandler {
  private lastTranscriptContent: string = '';
  private processedTranscripts = new Set<string>();
  
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
      return; // We don't save interim transcripts - only final ones
    }
    
    // Handle conversation.item.input_audio_transcription.completed events - final transcripts from OpenAI
    if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
      const finalTranscript = event.transcript;
      if (finalTranscript.trim() === '') {
        return; // Skip empty transcripts
      }
      
      // Create a fingerprint for deduplication
      const transcriptFingerprint = `${event.type}:${finalTranscript.substring(0, 50)}`;
      
      // Skip if we've already processed this exact transcript
      if (this.processedTranscripts.has(transcriptFingerprint)) {
        console.log('[TranscriptEventHandler] Skipping duplicate input audio transcription');
        return;
      }
      
      // Mark this transcript as processed
      this.processedTranscripts.add(transcriptFingerprint);
      this.lastTranscriptContent = finalTranscript;
        
      console.log(`[TranscriptEventHandler] Saving final user transcript from input_audio_transcription: "${finalTranscript.substring(0, 50)}..."`);
      
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
      
      return; // We've handled this event
    }
    
    // Handle final transcript completion - this is where we save user transcripts
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      if (finalTranscript.trim() === '') {
        return; // Skip empty transcripts
      }
      
      // Create a fingerprint for deduplication
      const transcriptFingerprint = `${event.type}:${finalTranscript.substring(0, 50)}`;
      
      // Skip if we've already processed this exact transcript
      if (this.processedTranscripts.has(transcriptFingerprint)) {
        console.log('[TranscriptEventHandler] Skipping duplicate transcript');
        return;
      }
      
      // Mark this transcript as processed
      this.processedTranscripts.add(transcriptFingerprint);
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
  
  // Clear processed transcripts (for testing or session resets)
  clearProcessedTranscripts() {
    this.processedTranscripts.clear();
  }
}
