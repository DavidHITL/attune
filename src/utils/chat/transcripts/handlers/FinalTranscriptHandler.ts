
import { MessageQueue } from '../../messageQueue';
import { TranscriptAccumulator } from './TranscriptAccumulator';

export class FinalTranscriptHandler {
  private lastSavedTranscript: string = '';
  private processingCount: number = 0;
  private savePending: boolean = false;
  
  constructor(
    private messageQueue: MessageQueue,
    private accumulator: TranscriptAccumulator
  ) {}

  handleFinalTranscript(text: string | undefined): void {
    if (!text) {
      // Check if we have accumulated text even though text param is empty
      const accumulatedText = this.accumulator.getAccumulatedText();
      if (accumulatedText && accumulatedText.trim() !== '') {
        console.log(`⚠️ Empty final transcript received, but accumulator has content. Saving accumulated: "${accumulatedText.substring(0, 50)}..."`);
        text = accumulatedText;
      } else {
        console.log("⚠️ Empty final transcript received, skipping");
        return;
      }
    }

    if (text.trim() === '') {
      console.log("⚠️ Blank final transcript received, skipping");
      return;
    }

    this.processingCount++;
    const currentCount = this.processingCount;
    console.log(`📝[${currentCount}] Processing final transcript: "${text.substring(0, 50)}..."`);
    
    // IMPROVED: Set a flag indicating we have pending save operation
    this.savePending = true;
    
    // IMPROVED: Always queue the message, even if it's a duplicate of the last one
    // During connection issues, it's better to have duplicates than missing content
    console.log(`🔴[${currentCount}] Queueing USER message with content: "${text.substring(0, 50)}..."`);
    
    // Add high priority flag to ensure it's processed quickly
    this.messageQueue.queueMessage('user', text, true);
    
    // Update last saved content
    this.lastSavedTranscript = text;
    
    // Clear the accumulator after processing
    this.accumulator.reset();
    this.savePending = false;
    console.log(`✅[${currentCount}] Transcript processed and accumulator reset`);
  }
  
  /**
   * Check if there is a pending save operation
   */
  hasPendingSave(): boolean {
    return this.savePending;
  }
  
  /**
   * Get last saved transcript content
   */
  getLastSavedTranscript(): string {
    return this.lastSavedTranscript;
  }
}

