
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
      
      // Enhanced logging for user speech events
      const role = EventTypeRegistry.getRoleForEvent(event.type);
      if (role === 'user' && this.isSpeechOrTranscriptEvent(event)) {
        console.log(`🎙️ [EVENT STRUCTURE DEBUG] #${eventId} User speech/transcript event detected:`, {
          eventType: event.type,
          role: role,
          timestamp: eventTime,
          // Deep structure logging
          structure: this.getEventStructure(event)
        });
        
        // Log potential text content paths
        this.logPotentialTextPaths(event, eventId);
      }
      
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
   * Check if an event is related to speech or transcript
   */
  private isSpeechOrTranscriptEvent(event: any): boolean {
    return event.type.includes('transcript') || 
           event.type.includes('speech') || 
           event.type.includes('audio') ||
           event.type === 'transcript';
  }
  
  /**
   * Get structured representation of event for debugging
   */
  private getEventStructure(event: any): any {
    try {
      // Create a clean copy without circular references
      return this.sanitizeObject(event);
    } catch (error) {
      return `Error extracting structure: ${error.message}`;
    }
  }
  
  /**
   * Sanitize object to avoid circular references and sensitive data
   */
  private sanitizeObject(obj: any, depth = 0, maxDepth = 5): any {
    if (depth >= maxDepth) return "[Max Depth Reached]";
    if (!obj || typeof obj !== 'object') return obj;
    
    const result: any = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        // Skip functions and private props
        if (typeof value === 'function' || key.startsWith('_')) {
          continue;
        }
        
        // Handle Buffer or ArrayBuffer specially
        if (value instanceof ArrayBuffer || 
           (typeof Buffer !== 'undefined' && value instanceof Buffer)) {
          result[key] = `[Binary data: ${value.byteLength} bytes]`;
          continue;
        }
        
        if (typeof value === 'object' && value !== null) {
          result[key] = this.sanitizeObject(value, depth + 1, maxDepth);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Log potential text content paths in the event structure
   */
  private logPotentialTextPaths(event: any, eventId: number): void {
    try {
      // First check direct text properties
      if (event.text) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Direct 'text' property found:`, event.text.substring(0, 100));
      } else if (event.transcript) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Direct 'transcript' property found:`, 
          typeof event.transcript === 'string' 
            ? event.transcript.substring(0, 100) 
            : event.transcript);
      }
      
      // Check deeper paths
      if (event.delta && event.delta.text) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.delta.text' found:`, event.delta.text.substring(0, 100));
      }
      
      if (event.transcript && event.transcript.text) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.transcript.text' found:`, event.transcript.text.substring(0, 100));
      }
      
      if (event.content_part && event.content_part.text) {
        console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.content_part.text' found:`, event.content_part.text.substring(0, 100));
      }
      
      // Check for other common paths
      const potentialPaths = [
        'content', 'message', 'audio_transcript', 'transcript_text', 
        'result', 'output', 'data'
      ];
      
      potentialPaths.forEach(path => {
        if (event[path]) {
          if (typeof event[path] === 'string') {
            console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.${path}' found:`, event[path].substring(0, 100));
          } else if (event[path].text) {
            console.log(`🎙️ [TEXT PATH] #${eventId} Path 'event.${path}.text' found:`, event[path].text.substring(0, 100));
          }
        }
      });
    } catch (error) {
      console.error(`🎙️ [TEXT PATH] #${eventId} Error logging potential text paths:`, error);
    }
  }
  
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
