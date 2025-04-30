
/**
 * Registry of event types and their role mappings
 * This is the single source of truth for event type categorization
 */
export class EventTypeRegistry {
  // Assistant events are response events from the AI
  private static readonly ASSISTANT_EVENTS = [
    'response.done',
    'response.delta',
    'response.content_part.done',
    'response.content_block.done'
  ];

  // User events are transcript and speech events 
  private static readonly USER_EVENTS = [
    'transcript',
    'response.audio_transcript.delta',
    'response.audio_transcript.done',
    'input_audio_buffer.speech_started',
    'input_audio_buffer.speech_stopped'
  ];

  // System events that don't map to either user or assistant
  private static readonly SYSTEM_EVENTS = [
    'output_audio_buffer.started',
    'output_audio_buffer.stopped',
    'input_audio_activity_started',
    'input_audio_activity_stopped',
    'input_audio_buffer.committed'
  ];

  /**
   * Check if an event type belongs to assistant responses
   */
  static isAssistantEvent(eventType: string): boolean {
    return this.ASSISTANT_EVENTS.includes(eventType) || 
           (eventType.includes('response.delta') && !eventType.includes('audio'));
  }

  /**
   * Check if an event type belongs to user transcripts
   */
  static isUserEvent(eventType: string): boolean {
    return this.USER_EVENTS.includes(eventType) || 
           eventType.includes('audio_transcript');
  }

  /**
   * Check if an event is a system event (not user or assistant)
   */
  static isSystemEvent(eventType: string): boolean {
    return this.SYSTEM_EVENTS.includes(eventType);
  }

  /**
   * Get role for an event type - this is the single source of truth
   * for mapping events to roles
   */
  static getRoleForEvent(eventType: string): 'user' | 'assistant' | null {
    if (this.isAssistantEvent(eventType)) {
      return 'assistant';
    }
    
    if (this.isUserEvent(eventType)) {
      return 'user';
    }
    
    return null;
  }

  /**
   * Check if an event type has a valid role mapping
   */
  static hasRoleMapping(eventType: string): boolean {
    return this.getRoleForEvent(eventType) !== null;
  }

  /**
   * Debug utility to get event category name
   */
  static getEventCategoryName(eventType: string): string {
    if (this.isAssistantEvent(eventType)) {
      return 'ASSISTANT';
    } else if (this.isUserEvent(eventType)) {
      return 'USER';
    } else if (this.isSystemEvent(eventType)) {
      return 'SYSTEM';
    } else {
      return 'UNKNOWN';
    }
  }
}
