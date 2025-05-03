
/**
 * Central message processing system that uses the event dispatcher
 * with improved event validation and flow
 */
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { EventDispatcher } from './events/EventDispatcher';
import { UserEventHandler } from './events/handlers/UserEventHandler';
import { AssistantEventHandler } from './events/handlers/AssistantEventHandler';
import { MessageCallback } from '../types';
import { EventTypeRegistry } from './events/EventTypeRegistry';

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
    
    console.log('[MessageEventProcessor] Initialized with handlers and dispatcher');
  }
  
  /**
   * Process incoming message events with improved validation
   */
  processEvent(event: any): void {
    // Skip processing if event has no type
    if (!event || !event.type) {
      console.log('[MessageEventProcessor] Received event with no type, skipping');
      return;
    }
    
    // First pass the event to the general callback
    this.messageCallback(event);
    
    // Log the event type and role for debugging
    if (event.type !== 'input_audio_buffer.append') {
      const role = EventTypeRegistry.getRoleForEvent(event.type);
      console.log(`[MessageEventProcessor] Processing event: ${event.type}, role: ${role || 'unknown'}, time: ${new Date().toISOString()}`);
    }
    
    // Use the central dispatcher to route the event
    this.eventDispatcher.dispatchEvent(event);
  }
  
  /**
   * Clean up and flush any pending messages
   */
  flushPendingMessages(): void {
    console.log('[MessageEventProcessor] Flushing any pending messages');
    this.assistantEventHandler.flushPendingResponse();
    this.messageQueue.flushQueue();
  }
}
