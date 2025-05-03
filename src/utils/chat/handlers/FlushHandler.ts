
/**
 * Manages flushing pending messages from different components
 */
export class FlushHandler {
  constructor(
    private speechEventHandler: any,
    private userEventHandler: any,
    private messageQueue: any
  ) {}
  
  /**
   * Flush any pending messages before disconnection
   */
  flushPendingMessages(): void {
    const startTime = Date.now();
    console.log("[FlushHandler] Force flushing pending messages before disconnection", {
      timestamp: new Date(startTime).toISOString(),
      operation: 'flushPendingMessages'
    });
    
    // Flush any pending speech transcript
    console.log("[FlushHandler] Flushing speech event handler pending transcript");
    this.speechEventHandler.flushPendingTranscript();
    
    // Also tell user event handler to flush any accumulated transcript
    if (this.userEventHandler) {
      console.log("[FlushHandler] Flushing user event handler accumulated transcript");
      this.userEventHandler.flushAccumulatedTranscript();
    }
    
    // Force queue to process any pending messages
    if (this.messageQueue) {
      console.log("[FlushHandler] Force flushing message queue");
      this.messageQueue.forceFlushQueue();
    }
    
    // Log completion time
    const completionTime = Date.now();
    console.log("[FlushHandler] Flush operation completed", {
      totalTimeMs: completionTime - startTime,
      timestamp: new Date(completionTime).toISOString()
    });
  }
}
