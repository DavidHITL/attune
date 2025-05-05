
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { EventDispatcher } from './events/EventDispatcher';
import { UserEventHandler } from './events/handlers/UserEventHandler';
import { AssistantEventHandler } from './events/handlers/AssistantEventHandler';
import { SpeechEventHandler } from './events/SpeechEventHandler';
import { TranscriptHandler } from './transcripts/TranscriptHandler';
import { LoggingHandler } from './handlers/LoggingHandler';
import { EventIdentifier } from './handlers/EventIdentifier';
import { FlushHandler } from './handlers/FlushHandler';

/**
 * Orchestrates event handling across the application
 * Delegates specialized handling to focused handlers
 */
export class EventHandler {
  private eventDispatcher: EventDispatcher;
  private speechEventHandler: SpeechEventHandler;
  private transcriptHandler: TranscriptHandler;
  private userEventHandler: UserEventHandler;
  private loggingHandler: LoggingHandler;
  private eventIdentifier: EventIdentifier;
  private flushHandler: FlushHandler;

  constructor(
    private messageQueue: MessageQueue, 
    private responseParser: ResponseParser,
    private messageCallback: (event: any) => void
  ) {
    // Initialize specialized handlers
    this.userEventHandler = new UserEventHandler(messageQueue);
    const assistantEventHandler = new AssistantEventHandler(messageQueue, responseParser);
    
    // Initialize support services
    this.eventDispatcher = new EventDispatcher(
      this.userEventHandler,
      assistantEventHandler
    );
    
    this.transcriptHandler = new TranscriptHandler(messageQueue);
    this.speechEventHandler = new SpeechEventHandler(this.transcriptHandler);
    this.loggingHandler = new LoggingHandler();
    this.eventIdentifier = new EventIdentifier();
    this.flushHandler = new FlushHandler(
      this.speechEventHandler,
      this.userEventHandler,
      this.messageQueue
    );
    
    console.log('[EventHandler] Initialized event handling system');
  }
  
  /**
   * Main message handler for events from the WebRTC connection
   */
  handleMessage = (event: any): void => {
    try {
      // Skip events with no type
      if (!event || !event.type) {
        console.log('[EventHandler] Received event with no type, skipping');
        return;
      }

      // Log the event with a unique identifier
      const eventId = this.loggingHandler.logEvent(event, 'Received event type');
      
      // Enhanced logging for user speech events
      const role = this.eventIdentifier.getEventRole(event.type);
      if (role === 'user' && this.eventIdentifier.isSpeechOrTranscriptEvent(event)) {
        console.log(`🎙️ [EVENT STRUCTURE DEBUG] #${eventId} User speech/transcript event detected:`, {
          eventType: event.type,
          role: role,
          timestamp: new Date().toISOString(),
          // Deep structure logging
          structure: this.loggingHandler.getEventStructure(event)
        });
        
        // Log potential text content paths
        this.loggingHandler.logPotentialTextPaths(event, eventId);
      }
      
      // Check for connection close events to force transcript saving
      if (this.eventIdentifier.isConnectionEvent(event)) {
        console.log(`[EventHandler] #${eventId} Connection event detected: ${event.type}, forcing flush of all pending content`, {
          timestamp: new Date().toISOString(),
          eventType: event.type,
          forceSave: true
        });
        this.flushPendingMessages();
      }
      
      // Process speech events
      this.speechEventHandler.handleSpeechEvents(event);
      
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
    this.flushHandler.flushPendingMessages();
  }
}
