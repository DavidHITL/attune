
/**
 * Handles accumulation of transcript text over time
 * with enhanced safety mechanisms
 */
export class TranscriptAccumulator {
  private accumulatedText: string = '';
  private lastUpdateTime: number = 0;
  private staleThresholdMs: number = 1500; // Consider transcript stale after 1.5s
  private textHistory: Array<{text: string, timestamp: number}> = [];
  private maxHistoryItems: number = 5;
  private debugId: string = `TA-${Date.now().toString(36)}`;
  
  constructor() {
    console.log(`[TranscriptAccumulator ${this.debugId}] Initialized with safety features`);
  }
  
  /**
   * Add content to transcript accumulator
   */
  accumulateText(text: string): void {
    if (!text) return;
    
    const now = Date.now();
    const hadContentBefore = !!this.accumulatedText;
    
    // Add new content
    this.accumulatedText += text;
    this.lastUpdateTime = now;
    
    // Save to history for recovery if needed
    this.addToHistory(this.accumulatedText);
    
    console.log(`[TranscriptAccumulator ${this.debugId}] Accumulated text (${this.accumulatedText.length} chars): "${this.accumulatedText.substring(0, 30)}${this.accumulatedText.length > 30 ? "..." : ""}" (delta: ${text.length} chars)`);
  }
  
  /**
   * Add current text to history for recovery
   */
  private addToHistory(text: string): void {
    // Only add if text is meaningful
    if (text && text.trim()) {
      this.textHistory.push({
        text,
        timestamp: Date.now()
      });
      
      // Trim history if too large
      if (this.textHistory.length > this.maxHistoryItems) {
        this.textHistory.shift();
      }
    }
  }
  
  /**
   * Get accumulated transcript
   */
  getAccumulatedText(): string {
    return this.accumulatedText;
  }
  
  /**
   * Clear accumulated transcript
   */
  reset(): void {
    // Save to history before clearing
    if (this.accumulatedText) {
      this.addToHistory(this.accumulatedText);
      
      console.log(`[TranscriptAccumulator ${this.debugId}] Resetting accumulator (was ${this.accumulatedText.length} chars): "${this.accumulatedText.substring(0, 50)}${this.accumulatedText.length > 50 ? "..." : ""}"`);
    }
    
    this.accumulatedText = '';
  }
  
  /**
   * Check if transcript is non-empty
   */
  hasContent(): boolean {
    return !!this.accumulatedText && this.accumulatedText.trim() !== '';
  }
  
  /**
   * Check if transcript hasn't been updated recently
   */
  isTranscriptStale(): boolean {
    return Date.now() - this.lastUpdateTime > this.staleThresholdMs;
  }
  
  /**
   * Get time since last update in ms
   */
  getTimeSinceLastUpdateMs(): number {
    return Date.now() - this.lastUpdateTime;
  }
  
  /**
   * Get the last transcript update time
   */
  getLastTranscriptTime(): number {
    return this.lastUpdateTime;
  }
  
  /**
   * Get the most recent history item other than current
   */
  getMostRecentHistoryText(): string | null {
    if (this.textHistory.length === 0) return null;
    
    // Get most recent item
    const mostRecent = this.textHistory[this.textHistory.length - 1];
    return mostRecent.text;
  }
  
  /**
   * Attempt to recover text if current is empty
   * Returns true if recovery was performed
   */
  recoverFromHistory(): boolean {
    // Only recover if current text is empty
    if (!this.hasContent() && this.textHistory.length > 0) {
      const recoveryText = this.getMostRecentHistoryText();
      
      if (recoveryText) {
        console.log(`[TranscriptAccumulator ${this.debugId}] Recovering text from history (${recoveryText.length} chars)`);
        this.accumulatedText = recoveryText;
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get debug information
   */
  getDebugInfo(): object {
    return {
      id: this.debugId,
      textLength: this.accumulatedText.length,
      hasContent: this.hasContent(),
      isStale: this.isTranscriptStale(),
      timeSinceUpdate: this.getTimeSinceLastUpdateMs(),
      historyItems: this.textHistory.length,
      preview: this.accumulatedText ? 
        `${this.accumulatedText.substring(0, 30)}${this.accumulatedText.length > 30 ? "..." : ""}` : 
        "(empty)"
    };
  }
}
