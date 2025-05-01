
/**
 * Standard event types for all events in the system
 */
export enum EventType {
  // System events
  SessionCreated = "session.created",
  SessionUpdated = "session.updated",
  SessionTerminated = "session.terminated",
  ConnectionEstablished = "connection.established",
  ConnectionError = "connection.error",
  ConversationTruncated = "conversation.item.truncated",
  
  // Speech and transcript events
  SpeechStarted = "input_audio_buffer.speech_started",
  SpeechStopped = "input_audio_buffer.speech_stopped",
  AudioBufferCommitted = "input_audio_buffer.committed",
  DirectTranscript = "transcript",
  
  // Audio transcript events
  AudioTranscriptDelta = "response.audio_transcript.delta",
  AudioTranscriptDone = "response.audio_transcript.done",
  
  // Response events
  ResponseCreated = "response.created",
  ResponseDelta = "response.delta", 
  ResponseDone = "response.done",
  ContentPartDone = "response.content_part.done"
}

/**
 * Helper function to check if an event is of a certain type
 */
export function isEventType(event: any, type: EventType): boolean {
  return event?.type === type;
}

/**
 * Helper function to extract transcript text from a transcript event
 */
export function extractTranscriptText(event: any): string | undefined {
  if (isEventType(event, EventType.DirectTranscript)) {
    return typeof event.transcript === 'string' ? event.transcript : undefined;
  } else if (isEventType(event, EventType.AudioTranscriptDelta) && event.delta?.text) {
    return event.delta.text;
  } else if (isEventType(event, EventType.AudioTranscriptDone)) {
    return event.transcript?.text || 
           (event.delta?.text) || 
           (typeof event.transcript === 'string' ? event.transcript : undefined);
  }
  return undefined;
}

/**
 * Helper function to extract content from assistant response events
 */
export function extractAssistantContent(event: any): string | undefined {
  if (isEventType(event, EventType.ResponseDone) && event.response?.content) {
    return event.response.content;
  } else if (isEventType(event, EventType.ContentPartDone) && event.content_part?.text) {
    return event.content_part.text;
  } else if (isEventType(event, EventType.ResponseDelta) && event.delta?.content) {
    return event.delta.content;
  }
  return undefined;
}
