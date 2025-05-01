
/**
 * Registry of event types and their role mappings
 * This is the single source of truth for event type categorization
 */
import { EventType, MessageRole } from './EventTypes';

export class EventTypeRegistry {
  // System events are general session and connection events
  private static readonly SYSTEM_EVENTS = [
    EventType.SessionCreated,
    EventType.SessionUpdated,
    EventType.SessionTerminated,
    EventType.ConnectionEstablished,
    EventType.ConnectionError,
    EventType.ConversationTruncated
  ];

  // Assistant events are response events from the AI
  private static readonly ASSISTANT_EVENTS = [
    EventType.ResponseCreated,
    EventType.ResponseDelta,
    EventType.ResponseDone,
    EventType.ContentPartDone
  ];

  // User events are transcript and speech events 
  private static readonly USER_EVENTS = [
    EventType.DirectTranscript,
    EventType.AudioTranscriptDelta,
    EventType.AudioTranscriptDone,
    EventType.SpeechStarted,
    EventType.SpeechStopped,
    EventType.AudioBufferCommitted
  ];

  // Quick lookup map for event type to role
  private static readonly EVENT_ROLE_MAP = new Map<string, MessageRole>([
    // System events
    [EventType.SessionCreated, 'system'],
    [EventType.SessionUpdated, 'system'],
    [EventType.SessionTerminated, 'system'],
    [EventType.ConnectionEstablished, 'system'],
    [EventType.ConnectionError, 'system'],
    [EventType.ConversationTruncated, 'system'],
    [EventType.OutputAudioBufferStarted, 'system'],
    [EventType.OutputAudioBufferStopped, 'system'],
    
    // Assistant events
    [EventType.ResponseCreated, 'assistant'],
    [EventType.ResponseDelta, 'assistant'],
    [EventType.ResponseDone, 'assistant'],
    [EventType.ContentPartDone, 'assistant'],
    
    // User events
    [EventType.DirectTranscript, 'user'],
    [EventType.AudioTranscriptDelta, 'user'],
    [EventType.AudioTranscriptDone, 'user'],
    [EventType.SpeechStarted, 'user'],
    [EventType.SpeechStopped, 'user'],
    [EventType.AudioBufferCommitted, 'user']
  ]);

  /**
   * Check if an event type belongs to system events
   */
  static isSystemEvent(eventType: string): boolean {
    return this.SYSTEM_EVENTS.includes(eventType as EventType) || 
           eventType === EventType.OutputAudioBufferStarted ||
           eventType === EventType.OutputAudioBufferStopped;
  }

  /**
   * Check if an event type belongs to assistant responses
   */
  static isAssistantEvent(eventType: string): boolean {
    return this.ASSISTANT_EVENTS.includes(eventType as EventType) || 
           (eventType.includes('response') && 
            !eventType.includes('audio_transcript'));
  }

  /**
   * Check if an event type belongs to user transcripts
   */
  static isUserEvent(eventType: string): boolean {
    return this.USER_EVENTS.includes(eventType as EventType) || 
           eventType.includes('audio_transcript');
  }

  /**
   * Get role for an event type using our definitive mapping
   */
  static getRoleForEvent(eventType: string): MessageRole | null {
    // First check our explicit mapping
    if (this.EVENT_ROLE_MAP.has(eventType)) {
      const role = this.EVENT_ROLE_MAP.get(eventType);
      console.log(`🔍 [EventTypeRegistry] Found explicit role mapping for ${eventType}: ${role}`);
      return role || null;
    }
    
    // Fall back to pattern matching for dynamic event types
    if (this.isAssistantEvent(eventType)) {
      console.log(`🔍 [EventTypeRegistry] Determined as assistant event: ${eventType}`);
      return 'assistant';
    }
    
    if (this.isUserEvent(eventType)) {
      console.log(`🔍 [EventTypeRegistry] Determined as user event: ${eventType}`);
      return 'user';
    }
    
    if (this.isSystemEvent(eventType)) {
      console.log(`🔍 [EventTypeRegistry] Determined as system event: ${eventType}`);
      return 'system';
    }
    
    console.log(`⚠️ [EventTypeRegistry] Could not determine role for event type: ${eventType}`);
    return null;
  }

  /**
   * Debug helper to get all known event types and their roles
   */
  static getAllEventRoleMappings(): Record<string, string> {
    const result: Record<string, string> = {};
    this.EVENT_ROLE_MAP.forEach((role, eventType) => {
      result[eventType] = role;
    });
    return result;
  }
}
