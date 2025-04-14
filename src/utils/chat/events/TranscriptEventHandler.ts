
import { EventType, extractTranscriptText } from './EventTypes';
import { toast } from 'sonner';

/**
 * Handler for transcript-related events with improved reliability
 */
export class TranscriptEventHandler {
  private lastTranscriptContent: string = '';
  private isProcessingTranscript: boolean = false;
  private pendingTranscripts: Set<string> = new Set();
  
  constructor(
    private saveUserMessage: (text: string) => void,
    private accumulateTranscript: (text: string) => void,
    private saveAccumulatedTranscript: () => void
  ) {}
  
  /**
   * Process events to extract and handle transcripts with enhanced reliability
   */
  handleTranscriptEvents(event: any): void {
    // Extract transcript text from event if available
    const transcriptText = this.extractTranscriptFromEvent(event);
    
    // Process direct transcript events (highest priority)
    if (event.type === "transcript" && event.transcript && event.transcript.trim()) {
      console.log("🎙️ Handling direct transcript event:", event.transcript.substring(0, 50));
      
      // Prevent duplicate processing of the same transcript
      if (this.lastTranscriptContent !== event.transcript) {
        this.lastTranscriptContent = event.transcript;
        this.isProcessingTranscript = true;
        
        // Show toast for transcript detection
        toast.info("Speech detected", { 
          description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
          duration: 2000
        });
        
        // High-priority save for direct transcript
        this.pendingTranscripts.add(event.transcript);
        setTimeout(() => {
          this.saveUserMessage(event.transcript);
          this.isProcessingTranscript = false;
          this.pendingTranscripts.delete(event.transcript);
        }, 100);
      }
    }
    
    // Handle speech start events
    if (event.type === "input_audio_buffer.speech_started") {
      console.log("🎤 Speech started - preparing to capture transcript");
      this.accumulateTranscript(''); // Reset accumulator at speech start
    }
    
    // Handle audio transcript delta events
    if (event.type === "response.audio_transcript.delta" && event.delta?.text) {
      console.log(`📝 Transcript delta received: "${event.delta.text}"`);
      this.accumulateTranscript(event.delta.text);
    }
    
    // Handle final transcript completion (highest reliability)
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      console.log("📄 Final audio transcript received:", finalTranscript.substring(0, 50));
      
      // Only save if this isn't a duplicate of what we just processed
      if (!this.isProcessingTranscript && this.lastTranscriptContent !== finalTranscript && finalTranscript.trim() !== '') {
        this.lastTranscriptContent = finalTranscript;
        
        // Show toast for final transcript
        toast.success("Speech transcribed", { 
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
        
        // Save with high priority and add to pending set
        this.pendingTranscripts.add(finalTranscript);
        this.saveUserMessage(finalTranscript);
        
        // Clear pending after a delay
        setTimeout(() => {
          this.pendingTranscripts.delete(finalTranscript);
        }, 2000);
      }
    }
    
    // Handle speech stopped events - save any accumulated transcript
    if (event.type === "input_audio_buffer.speech_stopped") {
      console.log("🛑 Speech stopped - saving any accumulated transcript");
      setTimeout(() => this.saveAccumulatedTranscript(), 300);
    }
  }
  
  /**
   * Extract any transcript text from an event
   */
  private extractTranscriptFromEvent(event: any): string | undefined {
    // Direct transcript event
    if (event.type === "transcript" && event.transcript) {
      return event.transcript;
    }
    
    // Final transcript event
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      return event.transcript.text;
    }
    
    // Delta transcript event
    if (event.type === "response.audio_transcript.delta" && event.delta?.text) {
      return event.delta.text;
    }
    
    return undefined;
  }
  
  /**
   * For cleanup - save any pending transcript
   */
  flushPendingTranscript(): void {
    console.log(`🧹 Flushing pending transcripts (${this.pendingTranscripts.size})`);
    
    // Save any accumulated transcript
    this.saveAccumulatedTranscript();
    
    // Also try to save any pending transcripts one last time
    if (this.pendingTranscripts.size > 0) {
      this.pendingTranscripts.forEach(transcript => {
        console.log(`📝 Flushing pending transcript: "${transcript.substring(0, 30)}..."`);
        this.saveUserMessage(transcript);
      });
      this.pendingTranscripts.clear();
    }
  }
}
