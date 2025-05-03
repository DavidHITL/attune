
import { EventType, isEventType } from './EventTypes';
import { TranscriptHandler } from '../transcripts/TranscriptHandler';
import { getMessageQueue } from '../messageQueue/QueueProvider';

/**
 * Handler for speech and transcript-related events
 */
export class SpeechEventHandler {
  private processedTranscripts = new Set<string>();
  
  constructor(private transcriptHandler: TranscriptHandler) {}

  /**
   * Process speech and transcript events
   */
  handleSpeechEvents(event: any): void {
    // Handle speech started events
    if (isEventType(event, EventType.SpeechStarted)) {
      this.transcriptHandler.handleSpeechStarted();
    }
    
    // Process events for user messages - only if we don't have a message queue
    // The primary transcript handling is now in useTranscriptHandler
    const messageQueue = getMessageQueue();
    const shouldProcessLocally = !messageQueue?.isInitialized();

    if (shouldProcessLocally) {
      console.log("No message queue available or not initialized, processing speech locally");
      
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
      
      // Handle final transcript completions
      if (isEventType(event, EventType.AudioTranscriptDone)) {
        console.log("FINAL TRANSCRIPT EVENT RECEIVED:", event.transcript?.text);
        this.transcriptHandler.handleFinalTranscript(event.transcript?.text);
      }
    }
    
    // Handle speech stopped events - always process this
    if (isEventType(event, EventType.SpeechStopped)) {
      this.transcriptHandler.handleSpeechStopped();
    }
    
    // Detect committed audio buffer events which may contain speech
    if (isEventType(event, EventType.AudioBufferCommitted)) {
      this.transcriptHandler.handleAudioBufferCommitted();
    }
    
    // Handle disconnection events
    if (isEventType(event, EventType.SessionDisconnected) || 
        isEventType(event, EventType.ConnectionClosed)) {
      console.log("CONNECTION CLOSED/DISCONNECTED - Saving any pending transcript");
      this.flushPendingTranscript();
    }
  }

  /**
   * For cleanup - save any pending transcript
   */
  flushPendingTranscript(): void {
    console.log("FLUSHING PENDING TRANSCRIPT FROM EVENT HANDLER");
    this.transcriptHandler.flushPendingTranscript();
  }
}
