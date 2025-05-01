
/**
 * Registry of event types and their role mappings
 * This is the single source of truth for event type categorization
 */
export class EventTypeRegistry {
  // System events are general session and connection events
  private static readonly SYSTEM_EVENTS = [
    'session.created',
    'session.updated',
    'session.terminated',
    'connection.established',
    'connection.error',
    'conversation.item.truncated'
  ];

  // Assistant events are response events from the AI
  private static readonly ASSISTANT_EVENTS = [
    'response.created',
    'response.delta',
    'response.done',
    'response.content_part.done',
  ];

  // User events are transcript and speech events 
  private static readonly USER_EVENTS = [
    'transcript',
    'response.audio_transcript.delta',
    'response.audio_transcript.done',
    'input_audio_buffer.speech_started',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.committed'
  ];

  /**
   * Check if an event type belongs to system events
   */
  static isSystemEvent(eventType: string): boolean {
    return this.SYSTEM_EVENTS.includes(eventType);
  }

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
   * Get role for an event type
   */
  static getRoleForEvent(eventType: string): 'user' | 'assistant' | 'system' | null {
    if (this.isAssistantEvent(eventType)) {
      return 'assistant';
    }
    
    if (this.isUserEvent(eventType)) {
      return 'user';
    }
    
    if (this.isSystemEvent(eventType)) {
      return 'system';
    }
    
    return null;
  }
}
