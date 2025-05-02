
import { MessageQueue } from '../../messageQueue';
import { TranscriptAccumulator } from './TranscriptAccumulator';

export class FinalTranscriptHandler {
  private lastSavedTranscript: string = '';
  private processingCount: number = 0;
  private savePending: boolean = false;
  private debugId: string;
  
  constructor(
    private messageQueue: MessageQueue,
    private accumulator: TranscriptAccumulator
  ) {
    this.debugId = `FTH-${Date.now().toString(36)}`;
    console.log(`[FinalTranscriptHandler ${this.debugId}] Initialized`);
  }

  handleFinalTranscript(text: string | undefined): void {
    this.processingCount++;
    const currentCount = this.processingCount;
    const startTime = Date.now();
    
    // Log the input to the handler
    console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} Processing request at ${new Date(startTime).toISOString()}`, {
      inputTextLength: text?.length ?? 0,
      inputTextProvided: !!text,
      inputTextPreview: text ? `${text.substring(0, 50)}${text.length > 50 ? '...' : ''}` : '(undefined)',
      accumulatorHasContent: this.accumulator.hasContent(),
      accumulatorContentLength: this.accumulator.getAccumulatedText().length,
      processingCount: currentCount
    });
    
    if (!text) {
      // Check if we have accumulated text even though text param is empty
      const accumulatedText = this.accumulator.getAccumulatedText();
      if (accumulatedText && accumulatedText.trim() !== '') {
        console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ⚠️ Empty final transcript received, but accumulator has content. Saving accumulated: "${accumulatedText.substring(0, 50)}..."`, {
          accumulatedLength: accumulatedText.length,
          accumulatedWords: accumulatedText.split(/\s+/).length
        });
        text = accumulatedText;
      } else {
        console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ⚠️ Empty final transcript received, skipping`);
        return;
      }
    }

    if (text.trim() === '') {
      console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ⚠️ Blank final transcript received, skipping`);
      return;
    }

    console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} Processing final transcript: "${text.substring(0, 50)}..."`, {
      contentLength: text.length,
      contentWords: text.trim().split(/\s+/).length,
      contentChunks: Math.ceil(text.length / 100),
      timestamp: new Date().toISOString()
    });
    
    // IMPROVED: Set a flag indicating we have pending save operation
    this.savePending = true;
    
    // IMPROVED: Always queue the message, even if it's a duplicate of the last one
    // During connection issues, it's better to have duplicates than missing content
    console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} 🔴 Queueing USER message with content: "${text.substring(0, 50)}..."`, {
      contentLength: text.length,
      isDuplicate: text === this.lastSavedTranscript,
      timestamp: new Date().toISOString()
    });
    
    // Record timing information for the operation
    const queueStartTime = Date.now();
    
    // Add high priority flag to ensure it's processed quickly
    this.messageQueue.queueMessage('user', text, true);
    
    // Update last saved content
    this.lastSavedTranscript = text;
    
    // Record time taken for the queue operation
    const queueTime = Date.now() - queueStartTime;
    
    // Clear the accumulator after processing
    const resetStartTime = Date.now();
    this.accumulator.reset();
    const resetTime = Date.now() - resetStartTime;
    
    this.savePending = false;
    console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ✅ Transcript processed and accumulator reset`, {
      totalTime: Date.now() - startTime,
      queueTime,
      resetTime,
      contentLength: text.length,
      timestamp: new Date().toISOString()
    });
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
  
  /**
   * Get debug information
   */
  getDebugInfo(): object {
    return {
      id: this.debugId,
      processingCount: this.processingCount,
      savePending: this.savePending,
      lastSavedTranscriptLength: this.lastSavedTranscript.length,
      lastSavedTranscriptPreview: this.lastSavedTranscript.length > 0 ? 
        `${this.lastSavedTranscript.substring(0, 50)}${this.lastSavedTranscript.length > 50 ? '...' : ''}` : 
        '(empty)'
    };
  }
}

