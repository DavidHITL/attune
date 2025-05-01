
import { EventType, isEventType } from './events/EventTypes';
import { TranscriptHandler } from './transcripts/TranscriptHandler';

/**
 * Handler for speech and transcript-related events
 * This is the PRIMARY handler for speech-related processing in the modern system
 */
export class SpeechEventHandler {
  private processedTranscripts: Set<string> = new Set();
  
  constructor(private transcriptHandler: TranscriptHandler) {
    console.log('[SpeechEventHandler] ✅ Initialized as PRIMARY speech event processor');
  }

  /**
   * Process speech and transcript events
   */
  handleSpeechEvents(event: any): void {
    // Handle speech started events
    if (isEventType(event, EventType.SpeechStarted)) {
      console.log('[SpeechEventHandler] 🎙️ Speech started detected');
      this.transcriptHandler.handleSpeechStarted();
    }
    
    // Process events for user messages
    if (isEventType(event, EventType.AudioTranscriptDelta)) {
      const deltaText = event.delta?.text;
      if (deltaText) {
        this.transcriptHandler.handleTranscriptDelta(deltaText);
      }
    }
    
    // Direct transcript handling (high priority)
    if (isEventType(event, EventType.DirectTranscript)) {
      // Skip if we've seen this exact transcript before
      const transcriptHash = this.hashTranscript(event.transcript);
      if (this.processedTranscripts.has(transcriptHash)) {
        return;
      }
      
      // Add to processed set
      this.processedTranscripts.add(transcriptHash);
      
      // Limit the size of the processed set
      if (this.processedTranscripts.size > 100) {
        this.processedTranscripts = new Set(
          Array.from(this.processedTranscripts).slice(-50)
        );
      }
      
      console.log("[SpeechEventHandler] 💬 DIRECT TRANSCRIPT RECEIVED:", event.transcript?.substring(0, 50));
      this.transcriptHandler.handleDirectTranscript(event.transcript);
    }
    
    // Handle speech stopped events
    if (isEventType(event, EventType.SpeechStopped)) {
      console.log('[SpeechEventHandler] 🔇 Speech stopped detected');
      this.transcriptHandler.handleSpeechStopped();
    }
    
    // Handle final transcript completions
    if (isEventType(event, EventType.AudioTranscriptDone)) {
      // Skip duplicates
      const transcriptHash = this.hashTranscript(event.transcript?.text);
      if (this.processedTranscripts.has(transcriptHash)) {
        return;
      }
      
      // Add to processed set
      if (event.transcript?.text) {
        this.processedTranscripts.add(transcriptHash);
      }
      
      console.log("[SpeechEventHandler] ✅ FINAL TRANSCRIPT RECEIVED:", event.transcript?.text?.substring(0, 50));
      this.transcriptHandler.handleFinalTranscript(event.transcript?.text);
    }
    
    // Detect committed audio buffer events which may contain speech
    if (isEventType(event, EventType.AudioBufferCommitted)) {
      this.transcriptHandler.handleAudioBufferCommitted();
    }
  }

  /**
   * For cleanup - save any pending transcript
   */
  flushPendingTranscript(): void {
    console.log('[SpeechEventHandler] 📝 Flushing any pending transcript');
    this.transcriptHandler.flushPendingTranscript();
  }
  
  /**
   * Create a simple hash of transcript for deduplication
   */
  private hashTranscript(transcript: string | undefined): string {
    if (!transcript) return 'empty';
    // Take the first N chars and the length as a simple hash
    const prefix = transcript.substring(0, 30);
    const length = transcript.length;
    return `${prefix}-${length}`;
  }
}
