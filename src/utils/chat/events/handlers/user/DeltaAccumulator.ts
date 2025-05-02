
/**
 * Component responsible for accumulating transcript deltas
 * and managing their timing thresholds
 */

export class DeltaAccumulator {
  private accumulatedContent: string = '';
  private lastProcessedTimestamp: number = 0;
  private saveThresholdMs: number = 300;
  private backupContent: string = ''; // Backup copy of the content
  private lastBackupTime: number = 0;
  private backupIntervalMs: number = 2000; // Backup every 2 seconds
  
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
    
    // Create a backup of the content periodically
    const now = Date.now();
    if (now - this.lastBackupTime > this.backupIntervalMs) {
      this.createBackup();
    }
  }
  
  /**
   * Create a backup of the current accumulated content
   */
  private createBackup(): void {
    this.backupContent = this.accumulatedContent;
    this.lastBackupTime = Date.now();
    console.log(`[DeltaAccumulator] Created content backup (${this.backupContent.length} chars) at ${new Date(this.lastBackupTime).toISOString()}`);
  }
  
  /**
   * Get the accumulated content
   */
  getAccumulatedContent(): string {
    return this.accumulatedContent;
  }
  
  /**
   * Get the backup content if available
   */
  getBackupContent(): string {
    return this.backupContent;
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
    
    // Create a final backup before reset
    if (hadContent) {
      this.createBackup();
    }
    
    this.accumulatedContent = '';
    
    if (hadContent) {
      console.log(`[DeltaAccumulator] Reset accumulator. Discarded content: "${contentPreview}${contentPreview.length > 50 ? '...' : ''}" (total chars discarded: ${this.accumulatedContent.length})`);
    } else {
      console.log('[DeltaAccumulator] Reset accumulator (was empty)');
    }
  }
  
  /**
   * Check if backup is more recent or substantial than current content
   */
  hasMoreSubstantialBackup(): boolean {
    // Backup is more substantial if it's longer and current content is empty
    const currentIsEmpty = this.accumulatedContent.trim() === '';
    const backupHasContent = this.backupContent.trim() !== '';
    const backupIsLonger = this.backupContent.length > this.accumulatedContent.length;
    
    return backupHasContent && (currentIsEmpty || backupIsLonger);
  }
  
  /**
   * Restore from backup if needed
   */
  restoreFromBackupIfNeeded(): boolean {
    if (this.hasMoreSubstantialBackup()) {
      console.log(`[DeltaAccumulator] Restoring from backup (current: ${this.accumulatedContent.length} chars, backup: ${this.backupContent.length} chars)`);
      this.accumulatedContent = this.backupContent;
      return true;
    }
    return false;
  }
}
