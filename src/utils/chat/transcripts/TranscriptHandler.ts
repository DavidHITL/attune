
import { MessageQueue } from '../messageQueue';
import { DirectTranscriptHandler } from './handlers/DirectTranscriptHandler';
import { FinalTranscriptHandler } from './handlers/FinalTranscriptHandler';
import { TranscriptAccumulator } from './handlers/TranscriptAccumulator';
import { SpeechStateTracker } from './handlers/SpeechStateTracker';
import { TranscriptNotifier } from './handlers/TranscriptNotifier';

export class TranscriptHandler {
  private accumulator: TranscriptAccumulator;
  private speechTracker: SpeechStateTracker;
  private notifier: TranscriptNotifier;
  private directHandler: DirectTranscriptHandler;
  private finalHandler: FinalTranscriptHandler;
  private lastCheckTime: number = 0;
  // IMPROVED: More aggressive saving (300ms)
  private saveIntervalMs: number = 300; 
  private lastSaveTime: number = 0;
  private forceSaveAfterMs: number = 800; // Force save after 800ms without saves
  // SAFETY ADDITIONS
  private emergencySaveTimer: NodeJS.Timeout | null = null;
  private emergencySaveIntervalMs: number = 1500; // Emergency save every 1.5 seconds if speech detected
  private failsafeBackupContent: string = '';
  private safetyChecksEnabled: boolean = true;
  private debugId: string = `TH-${Date.now().toString(36)}`;
  
  constructor(private messageQueue: MessageQueue) {
    this.accumulator = new TranscriptAccumulator();
    this.speechTracker = new SpeechStateTracker();
    this.notifier = new TranscriptNotifier();
    this.directHandler = new DirectTranscriptHandler(messageQueue);
    this.finalHandler = new FinalTranscriptHandler(messageQueue, this.accumulator);
    
    // Set up periodic check for stale transcripts
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkForStalledTranscripts(), 800);
      
      // Add page unload handler to save any pending content
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
    
    console.log(`[TranscriptHandler ${this.debugId}] Initialized with safety mechanisms`);
  }

  handleTranscriptDelta(deltaText: string): void {
    if (deltaText) {
      this.accumulator.accumulateText(deltaText);
      console.log(`[TranscriptHandler ${this.debugId}] 📝 Accumulating transcript delta: "${deltaText}"`);
      
      // Create a backup of the content
      this.updateFailsafeBackup();
      
      // IMPROVED: Check if we should save accumulated text based on time
      const now = Date.now();
      if (now - this.lastCheckTime > this.saveIntervalMs && this.hasAccumulatedTranscript()) {
        console.log(`[TranscriptHandler ${this.debugId}] 🕒 Time threshold reached, saving accumulated transcript`);
        const accumulatedText = this.accumulator.getAccumulatedText();
        this.finalHandler.handleFinalTranscript(accumulatedText);
        this.lastCheckTime = now;
        this.lastSaveTime = now;
      }
      
      // Start emergency save timer if not already running
      this.startEmergencySaveTimer();
    }
  }

  handleDirectTranscript(transcript: string): void {
    console.log(`[TranscriptHandler ${this.debugId}] 📝 Handling direct transcript: "${transcript.substring(0, 50)}..."`);
    this.directHandler.handleDirectTranscript(transcript);
    this.lastSaveTime = Date.now();
    
    // Update backup on direct transcript
    this.failsafeBackupContent = transcript;
  }

  handleFinalTranscript(text: string | undefined): void {
    console.log(`[TranscriptHandler ${this.debugId}] 📝 Handling final transcript: "${text?.substring(0, 50) || 'undefined'}..."`);
    
    // If no text provided but we have backup content, use that
    if (!text && this.failsafeBackupContent) {
      console.log(`[TranscriptHandler ${this.debugId}] ⚠️ No text provided, using failsafe backup (${this.failsafeBackupContent.length} chars)`);
      text = this.failsafeBackupContent;
    }
    
    this.finalHandler.handleFinalTranscript(text);
    
    // Reset the last check time after handling a final transcript
    this.lastCheckTime = Date.now();
    this.lastSaveTime = Date.now();
    
    // Reset emergency timer since we just saved
    this.resetEmergencySaveTimer();
  }

  handleSpeechStarted(): void {
    this.speechTracker.markSpeechStarted();
    console.log(`[TranscriptHandler ${this.debugId}] 🎙️ User speech started - preparing to capture transcript`);
    
    // Start emergency save timer when speech starts
    this.startEmergencySaveTimer();
  }

  handleSpeechStopped(): void {
    console.log(`[TranscriptHandler ${this.debugId}] 🎤 User speech stopped - checking for transcript`);
    
    if (this.speechTracker.isSpeechDetected()) {
      if (this.hasAccumulatedTranscript()) {
        const accumulatedText = this.accumulator.getAccumulatedText();
        console.log(`[TranscriptHandler ${this.debugId}] 🔴 SPEECH STOPPED WITH TRANSCRIPT: "${accumulatedText.substring(0, 50)}..."`);
        
        // Save immediately when speech stops
        this.finalHandler.handleFinalTranscript(accumulatedText);
      } else if (this.failsafeBackupContent) {
        // Use failsafe backup if we have no accumulated text
        console.log(`[TranscriptHandler ${this.debugId}] ⚠️ Speech stopped without transcript but failsafe available (${this.failsafeBackupContent.length} chars)`);
        this.finalHandler.handleFinalTranscript(this.failsafeBackupContent);
      } else {
        console.log(`[TranscriptHandler ${this.debugId}] ⚠️ Speech stopped but no transcript accumulated and no backup available`);
      }
      
      // Reset speech tracking after handling
      this.speechTracker.reset();
    }
    
    this.lastSaveTime = Date.now();
    
    // Stop emergency timer since speech has stopped
    this.resetEmergencySaveTimer();
  }

  handleAudioBufferCommitted(): void {
    console.log(`[TranscriptHandler ${this.debugId}] Audio buffer committed, checking if we need to save partial transcript`);
    
    if (this.speechTracker.isSpeechDetected() && 
        this.hasAccumulatedTranscript() &&
        this.accumulator.isTranscriptStale()) {
      
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`[TranscriptHandler ${this.debugId}] 📝 Saving stale transcript on buffer commit: "${accumulatedText.substring(0, 50)}..."`);
      this.finalHandler.handleFinalTranscript(accumulatedText);
      this.lastSaveTime = Date.now();
      
      // Update backup
      this.updateFailsafeBackup();
    }
  }

  flushPendingTranscript(): void {
    if (this.hasAccumulatedTranscript()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`[TranscriptHandler ${this.debugId}] 🔴 FLUSHING PENDING TRANSCRIPT: "${accumulatedText.substring(0, 50)}..."`);
      this.finalHandler.handleFinalTranscript(accumulatedText);
      this.lastSaveTime = Date.now();
    } else if (this.failsafeBackupContent) {
      // If no current content but we have a backup, use that as a safety measure
      console.log(`[TranscriptHandler ${this.debugId}] 🔄 No current transcript to flush, using failsafe backup (${this.failsafeBackupContent.length} chars)`);
      this.finalHandler.handleFinalTranscript(this.failsafeBackupContent);
    } else {
      console.log(`[TranscriptHandler ${this.debugId}] No pending transcript or backup to flush`);
    }
    
    // Reset emergency save timer
    this.resetEmergencySaveTimer();
  }

  private hasAccumulatedTranscript(): boolean {
    const text = this.accumulator.getAccumulatedText();
    return !!text && text.trim() !== '';
  }

  getTranscript(): string {
    return this.accumulator.getAccumulatedText();
  }

  clearTranscript(): void {
    // Save the content to backup before clearing
    this.updateFailsafeBackup();
    
    // Clear the actual transcript
    this.accumulator.reset();
  }

  isUserSpeechDetected(): boolean {
    return this.speechTracker.isSpeechDetected();
  }
  
  // ADDED: Safety mechanisms
  
  /**
   * Update the failsafe backup with current content if available
   */
  private updateFailsafeBackup(): void {
    const currentText = this.accumulator.getAccumulatedText();
    if (currentText && currentText.trim() !== '') {
      if (currentText.length > this.failsafeBackupContent.length) {
        this.failsafeBackupContent = currentText;
        console.log(`[TranscriptHandler ${this.debugId}] ✅ Updated failsafe backup (${this.failsafeBackupContent.length} chars)`);
      }
    }
  }
  
  /**
   * Start the emergency save timer if not already running
   */
  private startEmergencySaveTimer(): void {
    if (this.emergencySaveTimer === null && this.safetyChecksEnabled && typeof window !== 'undefined') {
      console.log(`[TranscriptHandler ${this.debugId}] 🔄 Starting emergency save timer (interval: ${this.emergencySaveIntervalMs}ms)`);
      this.emergencySaveTimer = setInterval(() => {
        this.performEmergencySave();
      }, this.emergencySaveIntervalMs);
    }
  }
  
  /**
   * Reset/stop the emergency save timer
   */
  private resetEmergencySaveTimer(): void {
    if (this.emergencySaveTimer !== null) {
      clearInterval(this.emergencySaveTimer);
      this.emergencySaveTimer = null;
      console.log(`[TranscriptHandler ${this.debugId}] 🛑 Emergency save timer stopped`);
    }
  }
  
  /**
   * Perform an emergency save if needed
   */
  private performEmergencySave(): void {
    if (this.speechTracker.isSpeechDetected() && this.hasAccumulatedTranscript()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`[TranscriptHandler ${this.debugId}] 🚨 EMERGENCY SAVE: Speech active for ${this.speechTracker.getSpeechDurationMs()}ms, saving transcript (${accumulatedText.length} chars)`);
      
      // Save with priority flag
      this.finalHandler.handleFinalTranscript(accumulatedText);
      this.lastSaveTime = Date.now();
    }
  }
  
  /**
   * Emergency save for critical situations like page unload
   */
  private performEmergencyContentSave(trigger: string): void {
    if (this.hasAccumulatedTranscript()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`[TranscriptHandler ${this.debugId}] 🚨 CRITICAL EMERGENCY SAVE (${trigger}): Saving transcript (${accumulatedText.length} chars)`);
      
      // Force immediate save
      if (this.messageQueue) {
        this.messageQueue.queueMessage('user', accumulatedText, true);
      }
    } else if (this.failsafeBackupContent) {
      console.log(`[TranscriptHandler ${this.debugId}] 🚨 CRITICAL EMERGENCY SAVE (${trigger}): No current content, using failsafe (${this.failsafeBackupContent.length} chars)`);
      
      // Force immediate save of backup
      if (this.messageQueue) {
        this.messageQueue.queueMessage('user', this.failsafeBackupContent, true);
      }
    }
  }
  
  // ADDED: Periodic check for stalled transcripts
  private checkForStalledTranscripts(): void {
    const now = Date.now();
    // If we have accumulated transcript and it's been more than our force save threshold since last save
    if (this.hasAccumulatedTranscript() && 
        (now - this.lastSaveTime > this.forceSaveAfterMs)) {
      console.log(`[TranscriptHandler ${this.debugId}] ⚠️ Found stalled transcript (${now - this.lastSaveTime}ms since last save), force saving`);
      this.flushPendingTranscript();
    }
    
    // Check if speech has been active for a long time without saving
    if (this.speechTracker.isSpeechDetected() && 
        this.speechTracker.getSpeechDurationMs() > 5000 && 
        (now - this.lastSaveTime > 2000)) {
      console.log(`[TranscriptHandler ${this.debugId}] ⚠️ Speech active for ${this.speechTracker.getSpeechDurationMs()}ms without recent save, forcing save`);
      this.flushPendingTranscript();
    }
    
    // Update backup if needed
    this.updateFailsafeBackup();
  }
}
