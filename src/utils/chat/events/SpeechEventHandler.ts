
import { EventType, isEventType } from './EventTypes';
import { TranscriptHandler } from '../transcripts/TranscriptHandler';
import { toast } from 'sonner';

/**
 * Handler for speech and transcript-related events
 */
export class SpeechEventHandler {
  constructor(private transcriptHandler: TranscriptHandler) {}

  /**
   * Process speech and transcript events
   */
  handleSpeechEvents(event: any): void {
    // Handle speech started events
    if (isEventType(event, EventType.SpeechStarted)) {
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
      console.log("DIRECT TRANSCRIPT EVENT RECEIVED:", event.transcript);
      this.transcriptHandler.handleDirectTranscript(event.transcript);
    }
    
    // Handle speech stopped events
    if (isEventType(event, EventType.SpeechStopped)) {
      this.transcriptHandler.handleSpeechStopped();
    }
    
    // Handle final transcript completions
    if (isEventType(event, EventType.AudioTranscriptDone)) {
      console.log("FINAL TRANSCRIPT EVENT RECEIVED:", event.transcript?.text);
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
    this.transcriptHandler.flushPendingTranscript();
  }
}
