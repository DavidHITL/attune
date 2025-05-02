
import { MessageQueue } from '../../messageQueue';
import { TranscriptAccumulator } from './TranscriptAccumulator';

export class FinalTranscriptHandler {
  private lastSavedTranscript: string = '';
  private processingCount: number = 0;
  private savePending: boolean = false;
  private debugId: string;
  private processingErrors: number = 0;
  private successfulSaves: number = 0;
  private savedTranscripts: Map<string, {content: string, timestamp: number}> = new Map();
  private maxSavedItems: number = 10;
  
  constructor(
    private messageQueue: MessageQueue,
    private accumulator: TranscriptAccumulator
  ) {
    this.debugId = `FTH-${Date.now().toString(36)}`;
    console.log(`[FinalTranscriptHandler ${this.debugId}] Initialized with safety measures`);
  }

  handleFinalTranscript(text: string | undefined): void {
    this.processingCount++;
    const currentCount = this.processingCount;
    const startTime = Date.now();
    const saveId = `save-${Date.now().toString(36)}-${currentCount}`;
    
    // Log the input to the handler
    console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} Processing request at ${new Date(startTime).toISOString()}`, {
      inputTextLength: text?.length ?? 0,
      inputTextProvided: !!text,
      inputTextPreview: text ? `${text.substring(0, 50)}${text.length > 50 ? '...' : ''}` : '(undefined)',
      accumulatorHasContent: this.accumulator.hasContent(),
      accumulatorContentLength: this.accumulator.getAccumulatedText().length,
      processingCount: currentCount,
      saveId
    });
    
    if (!text) {
      // Check if we have accumulated text even though text param is empty
      const accumulatedText = this.accumulator.getAccumulatedText();
      if (accumulatedText && accumulatedText.trim() !== '') {
        console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ⚠️ Empty final transcript received, but accumulator has content. Saving accumulated: "${accumulatedText.substring(0, 50)}..."`, {
          accumulatedLength: accumulatedText.length,
          accumulatedWords: accumulatedText.split(/\s+/).length,
          saveId
        });
        text = accumulatedText;
      } else {
        // Try to recover from history as last resort
        const recovered = this.accumulator.recoverFromHistory();
        if (recovered) {
          const recoveredText = this.accumulator.getAccumulatedText();
          console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ⚠️ Recovered text from history: "${recoveredText.substring(0, 50)}..."`, {
            recoveredLength: recoveredText.length,
            saveId
          });
          text = recoveredText;
        } else {
          console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ⚠️ Empty final transcript received, skipping`);
          return;
        }
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
      timestamp: new Date().toISOString(),
      saveId
    });
    
    // IMPROVED: Set a flag indicating we have pending save operation
    this.savePending = true;
    
    try {
      // IMPROVED: Always queue the message, even if it's a duplicate of the last one
      // During connection issues, it's better to have duplicates than missing content
      console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} 🔴 Queueing USER message with content: "${text.substring(0, 50)}..."`, {
        contentLength: text.length,
        isDuplicate: text === this.lastSavedTranscript,
        timestamp: new Date().toISOString(),
        saveId
      });
      
      // Record timing information for the operation
      const queueStartTime = Date.now();
      
      // Track this save attempt
      this.savedTranscripts.set(saveId, {
        content: text,
        timestamp: Date.now()
      });
      
      // Trim saved items if needed
      if (this.savedTranscripts.size > this.maxSavedItems) {
        const oldestKey = Array.from(this.savedTranscripts.keys())[0];
        this.savedTranscripts.delete(oldestKey);
      }
      
      // Add high priority flag to ensure it's processed quickly
      this.messageQueue.queueMessage('user', text, true);
      
      // Update last saved content
      this.lastSavedTranscript = text;
      
      // Record time taken for the queue operation
      const queueTime = Date.now() - queueStartTime;
      this.successfulSaves++;
      
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
        timestamp: new Date().toISOString(),
        saveId,
        successfulSaves: this.successfulSaves
      });
    } catch (error) {
      console.error(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ❌ Error processing transcript:`, error);
      this.processingErrors++;
      
      // Set fallback timeout to retry in case of error
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} 🔄 Retry after error`);
          try {
            // Make sure we still have the text content
            if (text) {
              this.messageQueue.queueMessage('user', text, true);
              console.log(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ✅ Retry successful`);
            }
          } catch (retryError) {
            console.error(`[FinalTranscriptHandler ${this.debugId}] #${currentCount} ❌ Retry failed:`, retryError);
          }
        }, 1000);
      }
    } finally {
      this.savePending = false;
    }
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
   * Force retry any saves from the last minute
   */
  forceRetryRecentSaves(): void {
    const now = Date.now();
    const retryCutoff = now - 60000; // 1 minute ago
    const saveIds = Array.from(this.savedTranscripts.entries())
      .filter(([_, data]) => data.timestamp >= retryCutoff);
      
    if (saveIds.length > 0) {
      console.log(`[FinalTranscriptHandler ${this.debugId}] 🔄 Force retrying ${saveIds.length} recent saves`);
      
      saveIds.forEach(([saveId, data], index) => {
        console.log(`[FinalTranscriptHandler ${this.debugId}] 🔄 Force retry #${index+1}/${saveIds.length} (${saveId}): "${data.content.substring(0, 30)}..."`);
        try {
          this.messageQueue.queueMessage('user', data.content, true);
        } catch (error) {
          console.error(`[FinalTranscriptHandler ${this.debugId}] ❌ Force retry failed for ${saveId}:`, error);
        }
      });
    }
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
      processingErrors: this.processingErrors,
      successfulSaves: this.successfulSaves,
      trackedSaves: this.savedTranscripts.size,
      lastSavedTranscriptPreview: this.lastSavedTranscript.length > 0 ? 
        `${this.lastSavedTranscript.substring(0, 50)}${this.lastSavedTranscript.length > 50 ? '...' : ''}` : 
        '(empty)'
    };
  }
}
