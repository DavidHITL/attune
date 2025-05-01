
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { MessageCallback } from '../types';
import { EventDispatcher } from './events/EventDispatcher';
import { UserEventHandler } from './events/handlers/UserEventHandler';
import { AssistantEventHandler } from './events/handlers/AssistantEventHandler';
import { SystemEventHandler } from './events/handlers/SystemEventHandler';
import { EventMonitor } from './events/EventMonitor';

export class EventHandler {
  private eventDispatcher: EventDispatcher;
  private userEventHandler: UserEventHandler;
  private assistantEventHandler: AssistantEventHandler;
  private systemEventHandler: SystemEventHandler;
  private eventMonitor: EventMonitor;

  constructor(
    messageQueue: MessageQueue,
    private responseParserInstance: ResponseParser,
    private messageCallback: MessageCallback
  ) {
    // Create specialized handlers
    this.userEventHandler = new UserEventHandler(messageQueue);
    this.assistantEventHandler = new AssistantEventHandler(messageQueue, responseParserInstance);
    this.systemEventHandler = new SystemEventHandler();
    
    // Create the central event dispatcher
    this.eventDispatcher = new EventDispatcher(
      this.userEventHandler,
      this.assistantEventHandler,
      this.systemEventHandler
    );
    
    this.eventMonitor = new EventMonitor();
  }

  handleMessage = (event: any): void => {
    // Log and pass the event to the general message callback
    this.responseParserInstance.logEvent(event);
    this.messageCallback(event);
    
    // Track audio-related events for debugging purposes
    this.eventMonitor.trackAudioEvent(event);
    
    // Use the event dispatcher to route the event
    this.eventDispatcher.dispatchEvent(event);
  }

  // For cleanup - save any pending messages
  flushPendingMessages(): void {
    const diagnostics = this.eventMonitor.getDiagnostics();
    console.log("Flushing pending messages, audio events detected:", diagnostics.audioEvents.join(", "));
    console.log("Speech was detected during this session:", diagnostics.speechDetected);
    
    // Flush any pending assistant response
    this.assistantEventHandler.flushPendingResponse();
  }
  
  // Expose the response parser for access in the component
  get responseParser(): ResponseParser {
    return this.responseParserInstance;
  }
}
