
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
  ];

  // User events are transcript and speech events 
  private static readonly USER_EVENTS = [
    'transcript',
    'response.audio_transcript.delta',
    'response.audio_transcript.done',
    'input_audio_buffer.speech_started',
    'input_audio_buffer.speech_stopped'
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
   * Get role for an event type
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
}
