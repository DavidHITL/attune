
/**
 * Enhanced speech and transcript event handler that ensures transcript capture
 */
import { EventType, isEventType } from './events/EventTypes';
import { TranscriptHandler } from './transcripts/TranscriptHandler';
import { UserEventProcessor } from './events/handlers/user/UserEventProcessor';
import { MessageQueue } from './messageQueue';

export class SpeechEventHandler {
  private userEventProcessor: UserEventProcessor;
  
  constructor(
    private transcriptHandler: TranscriptHandler, 
    private messageQueue: MessageQueue
  ) {
    // Initialize the enhanced user event processor for better transcript extraction
    this.userEventProcessor = new UserEventProcessor(messageQueue);
    console.log('[SpeechEventHandler] Initialized with enhanced transcript handling');
  }

  /**
   * Process speech and transcript events with multiple extraction mechanisms
   */
  handleSpeechEvents(event: any): void {
    // First attempt with the primary TranscriptHandler
    this.handleWithPrimaryProcessor(event);
    
    // Second attempt with the enhanced UserEventProcessor as a fallback
    this.handleWithEnhancedProcessor(event);
  }
  
  /**
   * Primary processing with the original TranscriptHandler
   */
  private handleWithPrimaryProcessor(event: any): void {
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
    
    // Handle disconnection events
    if (isEventType(event, EventType.SessionDisconnected) || 
        isEventType(event, EventType.ConnectionClosed)) {
      console.log("CONNECTION CLOSED/DISCONNECTED - Saving any pending transcript");
      this.flushPendingTranscript();
    }
  }
  
  /**
   * Enhanced processing with the UserEventProcessor
   * This runs in parallel as a safety net for transcript extraction
   */
  private handleWithEnhancedProcessor(event: any): void {
    // Process all events through the enhanced processor
    this.userEventProcessor.processEvent(event);
    
    // For disconnection events, ensure we save any accumulated content
    if (isEventType(event, EventType.SessionDisconnected) || 
        isEventType(event, EventType.ConnectionClosed)) {
      console.log("CONNECTION CLOSED/DISCONNECTED - Flushing enhanced processor");
      this.userEventProcessor.flushAccumulatedTranscript();
    }
  }

  /**
   * For cleanup - save any pending transcript
   */
  flushPendingTranscript(): void {
    console.log("FLUSHING PENDING TRANSCRIPT FROM EVENT HANDLER");
    // Flush through both processors for maximum safety
    this.transcriptHandler.flushPendingTranscript();
    this.userEventProcessor.flushAccumulatedTranscript();
    
    // Also force message queue processing
    this.messageQueue.forceFlushQueue().catch(err => {
      console.error("Error flushing message queue:", err);
    });
  }
}
