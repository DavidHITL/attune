
/**
 * Enum for event types
 */
export enum EventType {
  SpeechStarted = 'input_audio_buffer.speech_started',
  SpeechStopped = 'input_audio_buffer.speech_stopped',
  AudioTranscriptDelta = 'response.audio_transcript.delta',
  AudioTranscriptDone = 'response.audio_transcript.done',
  DirectTranscript = 'transcript',
  AudioBufferCommitted = 'input_audio_buffer.committed',
  AudioBufferAppend = 'input_audio_buffer.append',
  ResponseCreated = 'response.created',
  ResponseDelta = 'response.delta',
  ResponseDone = 'response.done',
  ResponseContentPartDone = 'response.content_part.done',
  ResponseContentPartAdded = 'response.content_part.added',
  SessionCreated = 'session.created',
  SessionDisconnected = 'session.disconnected',
  ConnectionClosed = 'connection.closed',
  // Adding missing enum values
  ConversationTruncated = 'conversation.item.truncated',
  ContentPartDone = 'response.content_part.done'
}

/**
 * Check if an event is of a specific type
 */
export function isEventType(event: any, type: EventType): boolean {
  return event && event.type === type;
}
