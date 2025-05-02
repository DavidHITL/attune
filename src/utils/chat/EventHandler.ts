
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { EventDispatcher } from './events/EventDispatcher';
import { UserEventHandler } from './events/handlers/UserEventHandler';
import { AssistantEventHandler } from './events/handlers/AssistantEventHandler';
import { SpeechEventHandler } from './events/SpeechEventHandler';
import { TranscriptHandler } from './transcripts/TranscriptHandler';
import { EventTypeRegistry } from './events/EventTypeRegistry';
import { EventType, isEventType } from './events/EventTypes';

export class EventHandler {
  private eventDispatcher: EventDispatcher;
  private speechEventHandler: SpeechEventHandler;
  private transcriptHandler: TranscriptHandler;
  private userEventHandler: UserEventHandler;
  private eventCounter: number = 0;

  constructor(
    private messageQueue: MessageQueue, 
    private responseParser: ResponseParser,
    private messageCallback: (event: any) => void
  ) {
    this.userEventHandler = new UserEventHandler(messageQueue);
    const assistantEventHandler = new AssistantEventHandler(messageQueue, responseParser);
    
    this.eventDispatcher = new EventDispatcher(
      this.userEventHandler,
      assistantEventHandler
    );
    
    this.transcriptHandler = new TranscriptHandler(messageQueue);
    this.speechEventHandler = new SpeechEventHandler(this.transcriptHandler);
    
    console.log('[EventHandler] Initialized event handling system');
  }
  
  /**
   * Main message handler for events from the WebRTC connection
   */
  handleMessage = (event: any): void => {
    try {
      this.eventCounter++;
      const eventId = this.eventCounter;
      const eventTime = new Date().toISOString();
      
      // Log basic event information
      console.log(`[EventHandler] #${eventId} Received event type: ${event.type}`, {
        timestamp: eventTime,
        eventId,
        eventType: event.type
      });
      
      // First check for connection close events to force transcript saving
      if (isEventType(event, EventType.ConnectionClosed) || 
          isEventType(event, EventType.SessionDisconnected)) {
        console.log(`[EventHandler] #${eventId} Connection event detected: ${event.type}, forcing flush of all pending content`, {
          timestamp: eventTime,
          eventType: event.type,
          forceSave: true
        });
        this.flushPendingMessages();
      }
      
      // Process speech events
      this.speechEventHandler.handleSpeechEvents(event);
      
      // Handle text parsing - primarily for assistant responses
      if (EventTypeRegistry.isAssistantEvent(event.type)) {
        this.responseParser.parseEvent(event);
      }
      
      // Dispatch event to appropriate handler based on role
      this.eventDispatcher.dispatchEvent(event);
      
      // Forward all events to message callback
      this.messageCallback(event);
      
    } catch (error) {
      console.error("[EventHandler] Error handling event:", error);
    }
  };
  
  /**
   * Flush any pending messages before disconnection
   */
  flushPendingMessages(): void {
    const startTime = Date.now();
    console.log("[EventHandler] Force flushing pending messages before disconnection", {
      timestamp: new Date(startTime).toISOString(),
      operation: 'flushPendingMessages'
    });
    
    // Flush any pending speech transcript
    console.log("[EventHandler] Flushing speech event handler pending transcript");
    this.speechEventHandler.flushPendingTranscript();
    
    // Also tell user event handler to flush any accumulated transcript
    if (this.userEventHandler) {
      console.log("[EventHandler] Flushing user event handler accumulated transcript");
      this.userEventHandler.flushAccumulatedTranscript();
    }
    
    // Force queue to process any pending messages
    if (this.messageQueue) {
      console.log("[EventHandler] Force flushing message queue");
      this.messageQueue.forceFlushQueue();
    }
    
    // Log completion time
    const completionTime = Date.now();
    console.log("[EventHandler] Flush operation completed", {
      totalTimeMs: completionTime - startTime,
      timestamp: new Date(completionTime).toISOString()
    });
  }
}

