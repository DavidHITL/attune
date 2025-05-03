
/**
 * Registry for event types and their roles
 */
import { handleSessionCreated } from './handlers/SessionEventHandler';

export class EventTypeRegistry {
  // Map of event types to their associated roles
  private static eventRoleMap: Record<string, 'user' | 'assistant' | null> = {
    // User events
    'transcript': 'user',
    'response.audio_transcript.delta': 'user',
    'response.audio_transcript.done': 'user',
    'input_audio_buffer.speech_started': 'user',
    'input_audio_buffer.speech_stopped': 'user',
    'input_audio_buffer.committed': 'user',
    'input_audio_buffer.append': 'user',
    'input_audio_activity_started': 'user',
    'input_audio_activity_stopped': 'user',
    
    // Assistant events
    'response.done': 'assistant',
    'response.created': 'assistant',
    'response.delta': 'assistant',
    'response.content_part.done': 'assistant',
    'response.content_part.added': 'assistant',
    'response.output_item.added': 'assistant',
    
    // Session events - no role
    'session.created': null,
    'session.disconnected': null,
    'connection.closed': null,
    'conversation.item.created': null,
    'rate_limits.updated': null,
    'output_audio_buffer.started': null,
    'output_audio_buffer.stopped': null
  };

  // Map of event types to their associated handlers
  private static eventHandlerMap: Record<string, Function> = {
    // Session events
    'session.created': handleSessionCreated,
    // Harmless no-op handlers for system events
    'output_audio_buffer.started': () => {},
    'output_audio_buffer.stopped': () => {},
    'rate_limits.updated': () => {}
  };

  /**
   * Check if an event is considered a user event
   */
  static isUserEvent(eventType: string): boolean {
    return this.getRoleForEvent(eventType) === 'user';
  }
  
  /**
   * Check if an event is considered an assistant event
   */
  static isAssistantEvent(eventType: string): boolean {
    return this.getRoleForEvent(eventType) === 'assistant';
  }
  
  /**
   * Get the role for a specific event type
   */
  static getRoleForEvent(eventType: string): 'user' | 'assistant' | null {
    // Check if we have a specific mapping for this event type
    if (eventType in this.eventRoleMap) {
      return this.eventRoleMap[eventType];
    }
    
    // Fallback to pattern matching for unknown event types
    if (eventType.includes('audio_transcript') || 
        eventType.includes('input_audio')) {
      console.log(`[EventTypeRegistry] Pattern-matched unknown event ${eventType} as user event`);
      return 'user';
    }
    
    if (eventType.includes('response') && 
        !eventType.includes('audio_transcript')) {
      console.log(`[EventTypeRegistry] Pattern-matched unknown event ${eventType} as assistant event`);
      return 'assistant';
    }
    
    // Unknown event type
    console.log(`[EventTypeRegistry] Unknown event type: ${eventType}`);
    return null;
  }
  
  /**
   * Get the handler for a specific event type if one exists
   */
  static getHandlerForEvent(eventType: string): Function | null {
    if (eventType in this.eventHandlerMap) {
      return this.eventHandlerMap[eventType];
    }
    return null;
  }
}
