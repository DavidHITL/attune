
import { EventType, isEventType } from './EventTypes';
import { TranscriptHandler } from '../transcripts/TranscriptHandler';
import { getMessageQueue } from '../messageQueue/QueueProvider';

/**
 * Handler for speech and transcript-related events
 */
export class SpeechEventHandler {
  private processedTranscripts = new Set<string>();
  private lastTranscriptTime = 0;
  private accumulatedDeltas: string = '';
  
  constructor(private transcriptHandler: TranscriptHandler) {}

  /**
   * Process speech and transcript events
   */
  handleSpeechEvents(event: any): void {
    // Handle speech started events
    if (isEventType(event, EventType.SpeechStarted)) {
      console.log("🎙️ SPEECH_STARTED event detected");
      this.transcriptHandler.handleSpeechStarted();
      this.accumulatedDeltas = ''; // Reset accumulated deltas
    }
    
    // Process events for user messages - only if we don't have a message queue
    // or if it's not initialized yet
    const messageQueue = getMessageQueue();
    const shouldProcessLocally = !messageQueue?.isInitialized();

    // Always process speech events locally to ensure transcripts are captured
    if (shouldProcessLocally) {
      console.log("Processing speech locally - queue not initialized");
      
      // Process delta transcript events (incremental updates)
      if (isEventType(event, EventType.AudioTranscriptDelta)) {
        const deltaText = event.delta?.text;
        if (deltaText) {
          this.accumulatedDeltas += deltaText;
          this.lastTranscriptTime = Date.now();
          this.transcriptHandler.handleTranscriptDelta(deltaText);
        }
      }
      
      // Process direct transcript events (high priority)
      if (isEventType(event, EventType.DirectTranscript)) {
        console.log("DIRECT TRANSCRIPT EVENT RECEIVED:", event.transcript);
        this.transcriptHandler.handleDirectTranscript(event.transcript);
      }
      
      // Handle final transcript completions
      if (isEventType(event, EventType.AudioTranscriptDone)) {
        console.log("FINAL TRANSCRIPT EVENT RECEIVED:", event.transcript?.text);
        const finalText = event.transcript?.text || this.accumulatedDeltas;
        this.transcriptHandler.handleFinalTranscript(finalText);
        this.accumulatedDeltas = ''; // Reset accumulated deltas
      }
    }
    
    // Handle speech stopped events - always process this regardless of queue initialization
    if (isEventType(event, EventType.SpeechStopped)) {
      console.log("🛑 SPEECH_STOPPED event detected");
      this.transcriptHandler.handleSpeechStopped();
      
      // If no final transcript arrives within 1 second after speech stopped,
      // use whatever we've accumulated
      setTimeout(() => {
        // Only flush if we haven't received a final transcript recently
        if (Date.now() - this.lastTranscriptTime > 1000 && this.accumulatedDeltas) {
          console.log("⏱️ No final transcript received after speech stopped, using accumulated deltas");
          this.transcriptHandler.handleFinalTranscript(this.accumulatedDeltas);
          this.accumulatedDeltas = '';
        }
      }, 1000);
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
    
    // If we have accumulated deltas but no final transcript, use those
    if (this.accumulatedDeltas) {
      console.log("Using accumulated deltas for final flush");
      this.transcriptHandler.handleFinalTranscript(this.accumulatedDeltas);
      this.accumulatedDeltas = '';
    } else {
      this.transcriptHandler.flushPendingTranscript();
    }
  }
}
