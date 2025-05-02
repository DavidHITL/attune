
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
    'response.created'
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
    // More strict matching for assistant events
    return this.ASSISTANT_EVENTS.includes(eventType) || 
           (eventType.includes('response') && 
            !eventType.includes('audio') && 
            !eventType.includes('transcript'));
  }

  /**
   * Check if an event type belongs to user transcripts
   */
  static isUserEvent(eventType: string): boolean {
    return this.USER_EVENTS.includes(eventType) || 
           eventType.includes('audio_transcript') ||
           eventType.includes('transcript');
  }

  /**
   * Get role for an event type
   */
  static getRoleForEvent(eventType: string): 'user' | 'assistant' | null {
    if (this.isAssistantEvent(eventType)) {
      console.log(`[EventTypeRegistry] Event ${eventType} classified as ASSISTANT event`);
      return 'assistant';
    }
    
    if (this.isUserEvent(eventType)) {
      console.log(`[EventTypeRegistry] Event ${eventType} classified as USER event`);
      return 'user';
    }
    
    console.log(`[EventTypeRegistry] Event ${eventType} could not be classified, returning null`);
    return null;
  }

  /**
   * Debug method to log event type classification
   */
  static debugEventClassification(eventType: string): void {
    const role = this.getRoleForEvent(eventType);
    const isAssistant = this.isAssistantEvent(eventType);
    const isUser = this.isUserEvent(eventType);
    
    console.log(`[EventType Debug] ${eventType}: role=${role}, isAssistant=${isAssistant}, isUser=${isUser}`);
  }
}
