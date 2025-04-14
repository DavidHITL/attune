
/**
 * Tracks active message save operations
 */
export class ActiveSavesTracker {
  private activeSaves: number = 0;
  
  /**
   * Increment active save operations
   */
  trackSaveStart(): void {
    this.activeSaves++;
  }
  
  /**
   * Decrement active save operations
   */
  trackSaveComplete(): void {
    if (this.activeSaves > 0) {
      this.activeSaves--;
    }
  }
  
  /**
   * Get current active save count
   */
  getActiveCount(): number {
    return this.activeSaves;
  }
  
  /**
   * Reset active save count
   */
  reset(): void {
    this.activeSaves = 0;
  }
}
