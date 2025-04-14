
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
    
    // Handle speech and transcript events with improved user message handling
    this.speechEventHandler.handleSpeechEvents(event);
    
    // Handle assistant response events
    this.responseEventHandler.handleAssistantResponse(event);
    
    // Log key transcript events for debugging
    if (event.type && 
      (event.type === 'transcript' || 
       event.type === 'response.audio_transcript.done' ||
       event.type === 'input_audio_buffer.speech_started' ||
       event.type === 'input_audio_buffer.speech_stopped')) {
      console.log(`Key transcript event: ${event.type}`);
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
