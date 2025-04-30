
/**
 * Central message processing system that uses the event dispatcher
 */
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { EventDispatcher } from './events/EventDispatcher';
import { UserEventHandler } from './events/handlers/UserEventHandler';
import { AssistantEventHandler } from './events/handlers/AssistantEventHandler';
import { MessageCallback } from '../types';

export class MessageEventProcessor {
  private eventDispatcher: EventDispatcher;
  private userEventHandler: UserEventHandler;
  private assistantEventHandler: AssistantEventHandler;
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser,
    private messageCallback: MessageCallback
  ) {
    // Initialize specialized handlers
    this.userEventHandler = new UserEventHandler(messageQueue);
    this.assistantEventHandler = new AssistantEventHandler(messageQueue, responseParser);
    
    // Initialize central event dispatcher
    this.eventDispatcher = new EventDispatcher(
      this.userEventHandler,
      this.assistantEventHandler
    );
  }
  
  /**
   * Process incoming message events
   */
  processEvent(event: any): void {
    // First pass the event to the general callback
    this.messageCallback(event);
    
    // Log the event for debugging
    this.responseParser.logEvent(event);
    
    // Use the central dispatcher to route the event
    this.eventDispatcher.dispatchEvent(event);
  }
  
  /**
   * Clean up and flush any pending messages
   */
  flushPendingMessages(): void {
    console.log('[MessageEventProcessor] Flushing any pending messages');
    this.assistantEventHandler.flushPendingResponse();
  }
}
