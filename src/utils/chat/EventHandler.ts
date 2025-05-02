
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
  }
  
  /**
   * Main message handler for events from the WebRTC connection
   */
  handleMessage = (event: any): void => {
    try {
      // First check for connection close events to force transcript saving
      if (isEventType(event, EventType.ConnectionClosed) || 
          isEventType(event, EventType.SessionDisconnected)) {
        console.log(`[EventHandler] Connection event detected: ${event.type}`);
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
    console.log("[EventHandler] Force flushing pending messages before disconnection");
    
    // Flush any pending speech transcript
    this.speechEventHandler.flushPendingTranscript();
    
    // Also tell user event handler to flush any accumulated transcript
    if (this.userEventHandler instanceof UserEventHandler) {
      (this.userEventHandler as any).flushAccumulatedTranscript?.();
    }
    
    // Force queue to process any pending messages
    if (this.messageQueue) {
      this.messageQueue.forceFlushQueue();
    }
  }
}
