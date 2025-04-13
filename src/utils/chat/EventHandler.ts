
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { MessageCallback } from '../types';
import { TranscriptHandler } from './transcripts/TranscriptHandler';
import { AssistantResponseHandler } from './responses/AssistantResponseHandler';
import { EventType, isEventType, extractTranscriptText } from './events/EventTypes';

export class EventHandler {
  private transcriptHandler: TranscriptHandler;
  private responseHandler: AssistantResponseHandler;
  private audioEvents: Set<string> = new Set();

  constructor(
    messageQueue: MessageQueue,
    responseParser: ResponseParser,
    private messageCallback: MessageCallback
  ) {
    this.transcriptHandler = new TranscriptHandler(messageQueue);
    this.responseHandler = new AssistantResponseHandler(messageQueue, responseParser);
  }

  handleMessage = (event: any): void => {
    // Log and pass the event to the general message callback
    this.responseParser.logEvent(event);
    this.messageCallback(event);
    
    // Track audio-related events for debugging purposes
    if (event.type?.includes('speech') || event.type?.includes('audio') || event.type?.includes('transcript')) {
      console.log(`SPEECH EVENT [${event.type}]:`, JSON.stringify(event).substring(0, 200));
      this.audioEvents.add(event.type);
    }
    
    // Handle speech and transcript events
    this.handleSpeechEvents(event);
    
    // Handle assistant response events
    this.handleAssistantResponse(event);
  }

  private handleSpeechEvents(event: any): void {
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
      this.transcriptHandler.handleDirectTranscript(event.transcript);
    }
    
    // Handle speech stopped events
    if (isEventType(event, EventType.SpeechStopped)) {
      this.transcriptHandler.handleSpeechStopped();
    }
    
    // Handle final transcript completions
    if (isEventType(event, EventType.AudioTranscriptDone)) {
      this.transcriptHandler.handleFinalTranscript(event.transcript?.text);
    }
    
    // Detect committed audio buffer events which may contain speech
    if (isEventType(event, EventType.AudioBufferCommitted)) {
      this.transcriptHandler.handleAudioBufferCommitted();
    }
  }

  private handleAssistantResponse(event: any): void {
    // Handle assistant response start
    if (isEventType(event, EventType.ResponseCreated)) {
      this.responseHandler.handleResponseCreated();
    }
    
    // Handle assistant message content
    if (isEventType(event, EventType.ResponseDelta)) {
      this.responseHandler.handleResponseDelta(event);
    }
    
    // Handle assistant message completion
    if (isEventType(event, EventType.ResponseDone)) {
      this.responseHandler.handleResponseDone(event);
    }
    
    // Additional handling for edge cases - handle truncated conversations
    if (isEventType(event, EventType.ConversationTruncated)) {
      this.responseHandler.handleConversationTruncated();
    }
    
    // Handle finalized content parts that might contain the full response
    if (isEventType(event, EventType.ContentPartDone) && event.content) {
      this.responseHandler.handleContentPartDone(event.content);
    }
  }

  // For cleanup - save any pending messages
  flushPendingMessages(): void {
    console.log("Flushing pending messages, audio events detected:", Array.from(this.audioEvents).join(", "));
    
    // Flush any pending assistant response
    this.responseHandler.flushPendingResponse();
    
    // Flush any pending user transcript
    this.transcriptHandler.flushPendingTranscript();
  }
  
  // Expose the response parser for access in the component
  get responseParser(): ResponseParser {
    return this.responseHandler['responseParser'];
  }
}
