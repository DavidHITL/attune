
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { MessageCallback } from '../types';
import { TranscriptHandler } from './transcripts/TranscriptHandler';
import { AssistantResponseHandler } from './responses/AssistantResponseHandler';
import { SpeechEventHandler } from './events/SpeechEventHandler';
import { ResponseEventHandler } from './events/ResponseEventHandler';
import { EventMonitor } from './events/EventMonitor';
import { toast } from 'sonner';

export class EventHandler {
  private speechEventHandler: SpeechEventHandler;
  private responseEventHandler: ResponseEventHandler;
  private eventMonitor: EventMonitor;

  constructor(
    messageQueue: MessageQueue,
    private responseParserInstance: ResponseParser,
    private messageCallback: MessageCallback
  ) {
    const transcriptHandler = new TranscriptHandler(messageQueue);
    const responseHandler = new AssistantResponseHandler(messageQueue, responseParserInstance);
    
    this.speechEventHandler = new SpeechEventHandler(transcriptHandler);
    this.responseEventHandler = new ResponseEventHandler(responseHandler);
    this.eventMonitor = new EventMonitor();
  }

  handleMessage = (event: any): void => {
    // Log and pass the event to the general message callback
    this.responseParserInstance.logEvent(event);
    this.messageCallback(event);
    
    // Track audio-related events for debugging purposes
    this.eventMonitor.trackAudioEvent(event);
    
    // CRITICAL FIX: Complete logging for transcript events
    if (event.type && (
        event.type === 'transcript' || 
        event.type.includes('audio_transcript')
    )) {
      let transcriptText = null;
      
      if (typeof event.transcript === 'string') {
        transcriptText = event.transcript;
      } else if (event.transcript && event.transcript.text) {
        transcriptText = event.transcript.text;
      } else if (event.delta && event.delta.text) {
        transcriptText = event.delta.text;
      }
      
      if (transcriptText) {
        console.log(`📝 EventHandler - Transcript event ${event.type}: "${transcriptText.substring(0, 100)}"`);
      }
    }
    
    // Handle speech and transcript events with improved user message handling
    this.speechEventHandler.handleSpeechEvents(event);
    
    // Handle assistant response events
    this.responseEventHandler.handleAssistantResponse(event);
    
    // CRITICAL FIX: Enhanced logging for key events
    if (event.type && 
      (event.type === 'transcript' || 
       event.type === 'response.audio_transcript.done' ||
       event.type === 'input_audio_buffer.speech_started' ||
       event.type === 'input_audio_buffer.speech_stopped')) {
      console.log(`Key transcript event: ${event.type}`);
      
      // Extra logging for final transcript
      if (event.type === 'response.audio_transcript.done') {
        if (event.transcript && event.transcript.text) {
          console.log(`FINAL TRANSCRIPT DATA: "${event.transcript.text}"`);
        } else {
          console.log("Final transcript event received but no text content");
        }
      }
    }
  }

  // For cleanup - save any pending messages
  flushPendingMessages(): void {
    const diagnostics = this.eventMonitor.getDiagnostics();
    console.log("Flushing pending messages, audio events detected:", diagnostics.audioEvents.join(", "));
    console.log("Speech was detected during this session:", diagnostics.speechDetected);
    
    // Flush any pending assistant response
    this.responseEventHandler.flushPendingResponse();
    
    // Flush any pending user transcript
    this.speechEventHandler.flushPendingTranscript();
  }
  
  // Expose the response parser for access in the component
  get responseParser(): ResponseParser {
    return this.responseParserInstance;
  }
}
