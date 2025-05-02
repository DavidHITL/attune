
import { EventType, isEventType } from './EventTypes';
import { TranscriptHandler } from '../transcripts/TranscriptHandler';

/**
 * Handler for speech and transcript-related events
 */
export class SpeechEventHandler {
  private debugId: string = `SEH-${Date.now().toString(36)}`;
  private lastEventTime: number = 0;
  private activeSessionId: string | null = null;
  private connectionClosed: boolean = false;
  
  constructor(private transcriptHandler: TranscriptHandler) {
    console.log(`[SpeechEventHandler ${this.debugId}] Initialized`);
  }

  /**
   * Process speech and transcript events
   */
  handleSpeechEvents(event: any): void {
    // Track event time for monitoring
    this.lastEventTime = Date.now();
    
    // Track session ID if available
    if (event.session_id && this.activeSessionId !== event.session_id) {
      const prevSessionId = this.activeSessionId;
      this.activeSessionId = event.session_id;
      console.log(`[SpeechEventHandler ${this.debugId}] Session ID: ${this.activeSessionId}${prevSessionId ? ` (was: ${prevSessionId})` : ''}`);
    }
    
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
      console.log(`[SpeechEventHandler ${this.debugId}] DIRECT TRANSCRIPT EVENT RECEIVED:`, event.transcript);
      this.transcriptHandler.handleDirectTranscript(event.transcript);
    }
    
    // Handle speech stopped events
    if (isEventType(event, EventType.SpeechStopped)) {
      this.transcriptHandler.handleSpeechStopped();
    }
    
    // Handle final transcript completions
    if (isEventType(event, EventType.AudioTranscriptDone)) {
      console.log(`[SpeechEventHandler ${this.debugId}] FINAL TRANSCRIPT EVENT RECEIVED:`, event.transcript?.text);
      this.transcriptHandler.handleFinalTranscript(event.transcript?.text);
    }
    
    // Detect committed audio buffer events which may contain speech
    if (isEventType(event, EventType.AudioBufferCommitted)) {
      this.transcriptHandler.handleAudioBufferCommitted();
    }
    
    // Handle disconnection events with multiple flush attempts for safety
    if (isEventType(event, EventType.SessionDisconnected) || 
        isEventType(event, EventType.ConnectionClosed)) {
      console.log(`[SpeechEventHandler ${this.debugId}] CONNECTION CLOSED/DISCONNECTED - Saving any pending transcript`);
      
      // Reset connection state
      this.connectionClosed = true;
      
      // Use a multi-stage flush approach with delays to ensure content is saved
      this.flushPendingTranscriptWithRetry();
    }
  }

  /**
   * For cleanup - save any pending transcript with retry mechanism
   */
  flushPendingTranscript(): void {
    console.log(`[SpeechEventHandler ${this.debugId}] FLUSHING PENDING TRANSCRIPT FROM EVENT HANDLER`);
    this.transcriptHandler.flushPendingTranscript();
  }
  
  /**
   * Multiple attempts at flushing with delays for reliability
   */
  private flushPendingTranscriptWithRetry(): void {
    // First immediate attempt
    console.log(`[SpeechEventHandler ${this.debugId}] First flush attempt on connection closed`);
    this.flushPendingTranscript();
    
    // Second attempt after a short delay
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        console.log(`[SpeechEventHandler ${this.debugId}] Second flush attempt (delayed)`);
        this.flushPendingTranscript();
        
        // Final attempt after longer delay
        setTimeout(() => {
          console.log(`[SpeechEventHandler ${this.debugId}] Final flush attempt`);
          this.flushPendingTranscript();
        }, 1000);
      }, 300);
    }
  }
  
  /**
   * Check if connection is closed
   */
  isConnectionClosed(): boolean {
    return this.connectionClosed;
  }
  
  /**
   * Get time since last event in ms
   */
  getTimeSinceLastEventMs(): number {
    return Date.now() - this.lastEventTime;
  }
  
  /**
   * Get active session ID
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }
}
