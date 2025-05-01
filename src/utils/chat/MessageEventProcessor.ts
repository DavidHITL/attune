
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
  private processedEventIds: Set<string> = new Set();
  
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
    
    // Generate an ID for this event to prevent duplicate processing
    const eventId = this.generateEventId(event);
    if (this.processedEventIds.has(eventId)) {
      // Skip events we've already processed
      return;
    }
    this.processedEventIds.add(eventId);
    
    // Limit processed events set size to prevent memory leaks
    if (this.processedEventIds.size > 1000) {
      const eventArray = Array.from(this.processedEventIds);
      this.processedEventIds = new Set(eventArray.slice(eventArray.length - 500));
    }
    
    // Only log non-buffer events or sample a small percentage
    if (!eventType.includes('audio_buffer') || Math.random() < 0.01) {
      console.log(`[MessageEventProcessor] Processing event: ${eventType}`);
    }
    
    // First pass the event to the general callback
    this.messageCallback(event);
    
    // Log the event for debugging
    this.eventLogger.logEvent(event);
    
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
  
  /**
   * Get event statistics for debugging
   */
  getEventStatistics(): any {
    return this.eventLogger.getEventCounts();
  }
  
  /**
   * Generate a unique ID for an event to prevent duplicate processing
   */
  private generateEventId(event: any): string {
    // For transcript events, use the transcript content as part of the ID
    if (event.type === 'transcript' && event.transcript) {
      return `${event.type}-${typeof event.transcript === 'string' ? 
        event.transcript.substring(0, 20) : 'object'}-${Date.now()}`;
    }
    
    // For response events, use content if available
    if (event.type === 'response.done' && event.response?.content) {
      return `${event.type}-${event.response.content.substring(0, 20)}-${Date.now()}`;
    }
    
    // Default ID with timestamp to make it unique
    return `${event.type}-${Math.random().toString(36).substring(2, 7)}-${Date.now()}`;
  }
}
