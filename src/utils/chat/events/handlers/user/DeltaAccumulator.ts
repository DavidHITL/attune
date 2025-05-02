
/**
 * Component responsible for accumulating transcript deltas
 * and managing their timing thresholds
 */

export class DeltaAccumulator {
  private accumulatedContent: string = '';
  private lastProcessedTimestamp: number = 0;
  private saveThresholdMs: number = 300;
  
  constructor() {
    console.log('[DeltaAccumulator] Initialized');
  }
  
  /**
   * Add content to the accumulator
   */
  accumulateDelta(deltaText: string): void {
    const contentBefore = this.accumulatedContent.length;
    this.accumulatedContent += deltaText;
    
    console.log(`[DeltaAccumulator] Added delta text: "${deltaText}" (${deltaText.length} chars)`, {
      contentBefore: contentBefore,
      contentAfter: this.accumulatedContent.length,
      deltaLength: deltaText.length,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Get the accumulated content
   */
  getAccumulatedContent(): string {
    return this.accumulatedContent;
  }
  
  /**
   * Check if enough time has passed to save the accumulated content
   */
  shouldProcessAccumulated(): boolean {
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessedTimestamp;
    const hasContent = this.accumulatedContent.trim() !== '';
    const shouldProcess = timeSinceLastProcess > this.saveThresholdMs && hasContent;
    
    if (shouldProcess) {
      console.log(`[DeltaAccumulator] Time threshold met (${timeSinceLastProcess}ms) with content length: ${this.accumulatedContent.length}`);
    }
    
    return shouldProcess;
  }
  
  /**
   * Check if the accumulated content is substantial enough to save
   * even if the time threshold hasn't been met
   */
  hasSubstantialContent(): boolean {
    const isSubstantial = this.accumulatedContent.length > 20 && this.accumulatedContent.includes(" ");
    
    if (isSubstantial) {
      console.log(`[DeltaAccumulator] Substantial content detected (${this.accumulatedContent.length} chars): "${this.accumulatedContent.substring(0, 50)}${this.accumulatedContent.length > 50 ? '...' : ''}"`);
    }
    
    return isSubstantial;
  }
  
  /**
   * Mark content as processed and update timestamp
   */
  markProcessed(): string {
    const content = this.accumulatedContent;
    this.lastProcessedTimestamp = Date.now();
    console.log(`[DeltaAccumulator] Marked content as processed at ${new Date(this.lastProcessedTimestamp).toISOString()}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" (${content.length} chars)`);
    return content;
  }
  
  /**
   * Reset the accumulator
   */
  reset(): void {
    const hadContent = this.accumulatedContent.length > 0;
    const contentPreview = this.accumulatedContent.substring(0, 50);
    
    this.accumulatedContent = '';
    
    if (hadContent) {
      console.log(`[DeltaAccumulator] Reset accumulator. Discarded content: "${contentPreview}${contentPreview.length > 50 ? '...' : ''}" (total chars discarded: ${this.accumulatedContent.length})`);
    } else {
      console.log('[DeltaAccumulator] Reset accumulator (was empty)');
    }
  }
}
