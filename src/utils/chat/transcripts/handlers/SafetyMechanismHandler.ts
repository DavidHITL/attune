
/**
 * Manages safety mechanisms for transcript handling
 */
export class SafetyMechanismHandler {
  private failsafeBackupContent: string = '';
  private lastBackupTime: number = 0;
  private emergencySaveTimer: NodeJS.Timeout | null = null;
  private emergencySaveIntervalMs: number = 1500; // Emergency save every 1.5 seconds if speech detected
  private debugId: string;
  
  constructor(
    private flushCallback: () => void,
    debugId: string
  ) {
    this.debugId = debugId;
    
    // Add page unload handler to save any pending content
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.performEmergencyContentSave('page-unload');
      });
      
      // Add visibility change handler to save content when tab becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.performEmergencyContentSave('visibility-change');
        }
      });
    }
    
    console.log(`[SafetyMechanismHandler ${this.debugId}] Initialized`);
  }
  
  /**
   * Update the failsafe backup with current content if available
   */
  updateFailsafeBackup(content: string): void {
    if (content && content.trim() !== '') {
      if (content.length > this.failsafeBackupContent.length) {
        this.failsafeBackupContent = content;
        this.lastBackupTime = Date.now();
        console.log(`[SafetyMechanismHandler ${this.debugId}] ✅ Updated failsafe backup (${this.failsafeBackupContent.length} chars)`);
      }
    }
  }
  
  /**
   * Start the emergency save timer if not already running
   */
  startEmergencySaveTimer(): void {
    if (this.emergencySaveTimer === null && typeof window !== 'undefined') {
      console.log(`[SafetyMechanismHandler ${this.debugId}] 🔄 Starting emergency save timer (interval: ${this.emergencySaveIntervalMs}ms)`);
      this.emergencySaveTimer = setInterval(() => {
        this.flushCallback();
      }, this.emergencySaveIntervalMs);
    }
  }
  
  /**
   * Reset/stop the emergency save timer
   */
  resetEmergencySaveTimer(): void {
    if (this.emergencySaveTimer !== null) {
      clearInterval(this.emergencySaveTimer);
      this.emergencySaveTimer = null;
      console.log(`[SafetyMechanismHandler ${this.debugId}] 🛑 Emergency save timer stopped`);
    }
  }
  
  /**
   * Emergency save for critical situations like page unload
   */
  performEmergencyContentSave(trigger: string): void {
    console.log(`[SafetyMechanismHandler ${this.debugId}] 🚨 CRITICAL EMERGENCY SAVE (${trigger}) triggered`);
    this.flushCallback();
  }
  
  /**
   * Get the failsafe backup content
   */
  getFailsafeBackupContent(): string {
    return this.failsafeBackupContent;
  }
  
  /**
   * Check if there's any failsafe backup content
   */
  hasFailsafeBackupContent(): boolean {
    return !!this.failsafeBackupContent && this.failsafeBackupContent.trim() !== '';
  }
}
