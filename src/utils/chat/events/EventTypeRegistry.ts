
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
    const isAssistant = this.ASSISTANT_EVENTS.includes(eventType) || 
           (eventType.includes('response.delta') && !eventType.includes('audio'));
    if (isAssistant) {
      console.log(`[EventTypeRegistry] 🤖 Event ${eventType} classified as ASSISTANT event`);
    }
    return isAssistant;
  }

  /**
   * Check if an event type belongs to user transcripts
   */
  static isUserEvent(eventType: string): boolean {
    const isUser = this.USER_EVENTS.includes(eventType) || 
           eventType.includes('audio_transcript');
    if (isUser) {
      console.log(`[EventTypeRegistry] 👤 Event ${eventType} classified as USER event`);
    }
    return isUser;
  }

  /**
   * Check if an event is a system event (not user or assistant)
   */
  static isSystemEvent(eventType: string): boolean {
    const isSystem = this.SYSTEM_EVENTS.includes(eventType);
    if (isSystem) {
      console.log(`[EventTypeRegistry] ⚙️ Event ${eventType} classified as SYSTEM event`);
    }
    return isSystem;
  }

  /**
   * Get role for an event type - this is the single source of truth
   * for mapping events to roles
   */
  static getRoleForEvent(eventType: string): 'user' | 'assistant' | null {
    if (this.isAssistantEvent(eventType)) {
      console.log(`[EventTypeRegistry] 🔄 Event ${eventType} mapped to role: assistant`);
      return 'assistant';
    }
    
    if (this.isUserEvent(eventType)) {
      console.log(`[EventTypeRegistry] 🔄 Event ${eventType} mapped to role: user`);
      return 'user';
    }
    
    console.log(`[EventTypeRegistry] ⚠️ Event ${eventType} has no role mapping (SYSTEM or UNKNOWN event)`);
    return null;
  }

  /**
   * Check if an event type has a valid role mapping
   */
  static hasRoleMapping(eventType: string): boolean {
    const hasMapping = this.getRoleForEvent(eventType) !== null;
    console.log(`[EventTypeRegistry] 🔍 Event ${eventType} has role mapping: ${hasMapping}`);
    return hasMapping;
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
