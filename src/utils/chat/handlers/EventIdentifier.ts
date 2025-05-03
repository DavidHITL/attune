
import { EventType, isEventType } from '../events/EventTypes';
import { EventTypeRegistry } from '../events/EventTypeRegistry';

/**
 * Handles event type identification and classification
 */
export class EventIdentifier {
  /**
   * Check if an event is related to speech or transcript
   */
  isSpeechOrTranscriptEvent(event: any): boolean {
    return event.type.includes('transcript') || 
           event.type.includes('speech') || 
           event.type.includes('audio') ||
           event.type === 'transcript';
  }
  
  /**
   * Check if event is a connection-related event
   */
  isConnectionEvent(event: any): boolean {
    return isEventType(event, EventType.ConnectionClosed) || 
           isEventType(event, EventType.SessionDisconnected);
  }
  
  /**
   * Get the role associated with this event
   */
  getEventRole(event: any): string | null {
    return EventTypeRegistry.getRoleForEvent(event.type);
  }
}
