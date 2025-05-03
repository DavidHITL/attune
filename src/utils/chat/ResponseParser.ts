
import { EventLogger } from './parsing/EventLogger';
import { ContentExtractor } from './parsing/ContentExtractor';
import { FallbackMessageConstructor } from './parsing/FallbackMessageConstructor';
import { ResponseEventStore } from './parsing/ResponseEventStore';

export class ResponseParser {
  private eventLogger: EventLogger;
  private contentExtractor: ContentExtractor;
  private fallbackMessageConstructor: FallbackMessageConstructor;
  private responseEventStore: ResponseEventStore;
  
  constructor() {
    this.eventLogger = new EventLogger();
    this.contentExtractor = new ContentExtractor();
    this.fallbackMessageConstructor = new FallbackMessageConstructor();
    this.responseEventStore = new ResponseEventStore();
  }
  
  // Parse an event for processing
  parseEvent(event: any): void {
    this.logEvent(event);
  }
  
  // Process an incoming event - fix for missing method
  processEvent(event: any, role: 'assistant' | 'user'): void {
    // Log the event for debugging purposes
    console.log(`[ResponseParser] Processing event with role ${role}:`, event.type);
    this.logEvent(event);
    
    // Extract content if available
    let content: string | null = null;
    
    if (event.type === 'response.delta') {
      content = this.extractContentFromDelta(event);
      if (content) {
        console.log(`[ResponseParser] Extracted content from delta: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
        // Store in buffer for later use
        this.responseEventStore.appendToBuffer(content);
      }
    }
    else if (event.type === 'response.done') {
      content = this.extractCompletedResponseFromDoneEvent(event);
      if (content) {
        console.log(`[ResponseParser] Extracted content from done event: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      }
    }
  }
  
  // Flush any pending content - fix for missing method
  flushPendingContent(): void {
    const buffer = this.responseEventStore.getMessageBuffer();
    if (buffer && buffer.trim()) {
      console.log(`[ResponseParser] Flushing pending content: "${buffer.substring(0, 30)}${buffer.length > 30 ? '...' : ''}"`);
    } else {
      console.log('[ResponseParser] No pending content to flush');
    }
    
    // Reset the buffer after flushing
    this.responseEventStore.resetBuffer();
  }
  
  // Log event for debugging purposes
  logEvent(event: any): void {
    this.eventLogger.logEvent(event);
    this.responseEventStore.storeEvent(event);
  }
  
  // Extract content from delta event with multiple fallbacks
  extractContentFromDelta(event: any): string | null {
    return this.contentExtractor.extractContentFromDelta(event);
  }
  
  // Extract completed response from done event
  extractCompletedResponseFromDoneEvent(event: any): string | null {
    const result = this.contentExtractor.extractCompletedResponseFromDoneEvent(
      event, 
      this.eventLogger.getEventLog(),
      this.responseEventStore.getStoredEvents()
    );
    
    // If no result found, try using buffered content
    if (!result && this.responseEventStore.getMessageBuffer()) {
      return this.responseEventStore.getMessageBuffer();
    }
    
    return result;
  }
  
  // Last-resort fallback to construct a message
  constructFallbackMessage(rawEvents: any[] | null = null): string | null {
    const events = rawEvents || this.responseEventStore.getStoredEvents();
    return this.fallbackMessageConstructor.constructFallbackMessage(
      events,
      this.responseEventStore.getMessageBuffer()
    );
  }
  
  // Get debugging information
  getEventCounts(): Record<string, number> {
    return this.eventLogger.getEventCounts();
  }
  
  getEventLog(): {type: string, timestamp: number, contentPreview?: string}[] {
    return this.eventLogger.getEventLog();
  }
  
  clearRawEvents(): void {
    this.responseEventStore.clear();
  }
  
  resetBuffer(): void {
    this.responseEventStore.resetBuffer();
  }
}
