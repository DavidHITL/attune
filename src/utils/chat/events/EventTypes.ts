
/**
 * Standard event types for speech and response events
 */
export enum EventType {
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
  ContentPartDone = "response.content_part.done",
  ConversationTruncated = "conversation.item.truncated"
}

/**
 * Helper function to check if an event is of a certain type
 */
export function isEventType(event: any, type: EventType): boolean {
  return event.type === type;
}

/**
 * Helper function to extract transcript text from a transcript event
 */
export function extractTranscriptText(event: any): string | undefined {
  if (event.type === EventType.DirectTranscript) {
    return event.transcript;
  } else if (event.type === EventType.AudioTranscriptDelta && event.delta?.text) {
    return event.delta.text;
  } else if (event.type === EventType.AudioTranscriptDone && event.transcript?.text) {
    return event.transcript.text;
  }
  return undefined;
}
