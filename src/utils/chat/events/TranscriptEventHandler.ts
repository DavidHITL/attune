
import { EventType, extractTranscriptText } from './EventTypes';

/**
 * Handler for transcript-related events
 */
export class TranscriptEventHandler {
  constructor(
    private saveUserMessage: (text: string) => void,
    private accumulateTranscript: (text: string) => void,
    private saveAccumulatedTranscript: () => void
  ) {}
  
  /**
   * Process events to extract and handle transcripts
   */
  handleTranscriptEvents(event: any): void {
    // Process transcript events to save user messages
    if (event.type === "transcript" && event.transcript) {
      console.log("Handling transcript event for saving:", event.transcript.substring(0, 50));
      this.saveUserMessage(event.transcript);
    }
    
    // Handle audio transcript delta events
    if (event.type === "response.audio_transcript.delta" && event.delta?.text) {
      this.accumulateTranscript(event.delta.text);
    }
    
    // Handle final transcript completion
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      console.log("Final audio transcript received:", event.transcript.text.substring(0, 50));
      this.saveUserMessage(event.transcript.text);
    }
  }
  
  /**
   * Extract any transcript text from an event
   */
  extractTranscriptText(event: any): string | undefined {
    return extractTranscriptText(event);
  }
  
  /**
   * Save accumulated transcript if length exceeds threshold
   */
  saveAccumulatedTranscriptIfNeeded(length: number = 15): void {
    if (length > 15) {
      this.saveAccumulatedTranscript();
    }
  }
}
