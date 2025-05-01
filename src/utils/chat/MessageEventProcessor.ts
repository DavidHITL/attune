
/**
 * Central message processing system that uses the event dispatcher
 */
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { EventDispatcher } from './events/EventDispatcher';
import { UserEventHandler } from './events/handlers/UserEventHandler';
import { AssistantEventHandler } from './events/handlers/AssistantEventHandler';
import { SystemEventHandler } from './events/handlers/SystemEventHandler';
import { MessageCallback } from '../types';
import { EventLogger } from './parsing/EventLogger';

export class MessageEventProcessor {
  private eventDispatcher: EventDispatcher;
  private userEventHandler: UserEventHandler;
  private assistantEventHandler: AssistantEventHandler;
  private systemEventHandler: SystemEventHandler;
  private eventLogger: EventLogger;
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser,
    private messageCallback: MessageCallback
  ) {
    // Initialize event logger
    this.eventLogger = new EventLogger();
    
    // Initialize specialized handlers
    this.userEventHandler = new UserEventHandler(messageQueue);
    this.assistantEventHandler = new AssistantEventHandler(messageQueue, responseParser);
    this.systemEventHandler = new SystemEventHandler();
    
    // Initialize central event dispatcher
    this.eventDispatcher = new EventDispatcher(
      this.userEventHandler,
      this.assistantEventHandler,
      this.systemEventHandler
    );
    
    console.log('[MessageEventProcessor] Initialized with event dispatcher and handlers');
  }
  
  /**
   * Process incoming message events
   */
  processEvent(event: any): void {
    const eventType = event?.type || 'unknown';
    console.log(`[MessageEventProcessor] Processing event: ${eventType}`);
    
    // First pass the event to the general callback
    this.messageCallback(event);
    
    // Log the event for debugging
    this.eventLogger.logEvent(event);
    this.responseParser.logEvent(event);
    
    // Use the central dispatcher to route the event
    this.eventDispatcher.dispatchEvent(event);
    
    // Log statistics periodically
    if (Math.random() < 0.05) { // ~5% chance per event to log stats
      this.eventLogger.logEventStats();
    }
  }
  
  /**
   * Clean up and flush any pending messages
   */
  flushPendingMessages(): void {
    console.log('[MessageEventProcessor] Flushing any pending messages');
    this.assistantEventHandler.flushPendingResponse();
  }
  
  /**
   * Get event statistics for debugging
   */
  getEventStatistics(): any {
    return this.eventLogger.getEventCounts();
  }
}
