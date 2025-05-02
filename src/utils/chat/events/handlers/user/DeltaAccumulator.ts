
/**
 * Component responsible for accumulating transcript deltas
 * and managing their timing thresholds
 */

export class DeltaAccumulator {
  private accumulatedContent: string = '';
  private lastProcessedTimestamp: number = 0;
  private saveThresholdMs: number = 300;
  
  constructor() {}
  
  /**
   * Add content to the accumulator
   */
  accumulateDelta(deltaText: string): void {
    this.accumulatedContent += deltaText;
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
    return now - this.lastProcessedTimestamp > this.saveThresholdMs && 
           this.accumulatedContent.trim() !== '';
  }
  
  /**
   * Check if the accumulated content is substantial enough to save
   * even if the time threshold hasn't been met
   */
  hasSubstantialContent(): boolean {
    return this.accumulatedContent.length > 20 && 
           this.accumulatedContent.includes(" ");
  }
  
  /**
   * Mark content as processed and update timestamp
   */
  markProcessed(): string {
    const content = this.accumulatedContent;
    this.lastProcessedTimestamp = Date.now();
    return content;
  }
  
  /**
   * Reset the accumulator
   */
  reset(): void {
    this.accumulatedContent = '';
  }
}
