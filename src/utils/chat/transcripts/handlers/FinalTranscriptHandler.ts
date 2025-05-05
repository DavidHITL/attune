
import { MessageQueue } from '../../messageQueue';
import { TranscriptAccumulator } from './TranscriptAccumulator';

/**
 * Handles final transcript processing and saving
 */
export class FinalTranscriptHandler {
  private lastProcessedTranscript: string = '';
  private processingCount: number = 0;
  
  constructor(
    private messageQueue: MessageQueue,
    private accumulator: TranscriptAccumulator
  ) {}
  
  /**
   * Handle final transcript by saving it through the message queue
   */
  handleFinalTranscript(transcript?: string): void {
    this.processingCount++;
    const processingId = this.processingCount;
    
    // If no explicit transcript is provided, use the accumulator
    let finalTranscript = transcript;
    if (!finalTranscript || finalTranscript.trim() === '') {
      finalTranscript = this.accumulator.getAccumulatedText();
      console.log(`[FinalTranscriptHandler #${processingId}] No explicit transcript, using accumulated: "${finalTranscript?.substring(0, 50)}${finalTranscript?.length > 50 ? '...' : ''}"`);
    }
    
    // Skip empty transcripts
    if (!finalTranscript || finalTranscript.trim() === '') {
      console.log(`[FinalTranscriptHandler #${processingId}] Skipping empty transcript`);
      return;
    }
    
    // Skip if identical to last processed (avoid duplicates)
    if (finalTranscript === this.lastProcessedTranscript) {
      console.log(`[FinalTranscriptHandler #${processingId}] Skipping duplicate transcript`);
      return;
    }
    
    // Update last processed transcript
    this.lastProcessedTranscript = finalTranscript;
    
    console.log(`[FinalTranscriptHandler #${processingId}] Processing final transcript: "${finalTranscript?.substring(0, 50)}${finalTranscript?.length > 50 ? '...' : ''}"`);
    
    try {
      // CRITICAL: Always use 'user' role for transcript handling
      // This ensures that user speech is always correctly attributed
      this.messageQueue.queueMessage('user', finalTranscript, true);
      console.log(`[FinalTranscriptHandler #${processingId}] Successfully queued message with role 'user'`);
    } catch (error) {
      console.error(`[FinalTranscriptHandler #${processingId}] Error saving transcript:`, error);
    }
  }
  
  /**
   * Check if we should handle this transcript
   */
  shouldHandleTranscript(transcript?: string): boolean {
    if (!transcript || transcript.trim() === '') {
      return false;
    }
    
    return true;
  }
}
