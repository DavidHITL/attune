
import { MessageQueue } from '../messageQueue';
import { DirectTranscriptHandler } from './handlers/DirectTranscriptHandler';
import { FinalTranscriptHandler } from './handlers/FinalTranscriptHandler';
import { TranscriptAccumulator } from './handlers/TranscriptAccumulator';
import { SpeechStateTracker } from './handlers/SpeechStateTracker';
import { TranscriptNotifier } from './handlers/TranscriptNotifier';
import { SafetyMechanismHandler } from './handlers/SafetyMechanismHandler';
import { TranscriptStalenessMonitor } from './handlers/TranscriptStalenessMonitor';
import { PeriodicTranscriptChecker } from './handlers/PeriodicTranscriptChecker';

export class TranscriptHandler {
  private accumulator: TranscriptAccumulator;
  private speechTracker: SpeechStateTracker;
  private notifier: TranscriptNotifier;
  private directHandler: DirectTranscriptHandler;
  private finalHandler: FinalTranscriptHandler;
  private safetyHandler: SafetyMechanismHandler;
  private stalenessMonitor: TranscriptStalenessMonitor;
  private periodicChecker: PeriodicTranscriptChecker;
  private debugId: string = `TH-${Date.now().toString(36)}`;
  
  constructor(private messageQueue: MessageQueue) {
    this.accumulator = new TranscriptAccumulator();
    this.speechTracker = new SpeechStateTracker();
    this.notifier = new TranscriptNotifier();
    this.directHandler = new DirectTranscriptHandler(messageQueue);
    this.finalHandler = new FinalTranscriptHandler(messageQueue, this.accumulator);
    
    // Initialize the new helper components
    this.safetyHandler = new SafetyMechanismHandler(
      () => this.flushPendingTranscript(),
      this.debugId
    );
    
    this.stalenessMonitor = new TranscriptStalenessMonitor(
      this.accumulator,
      this.speechTracker,
      () => this.flushPendingTranscript(),
      this.debugId
    );
    
    this.periodicChecker = new PeriodicTranscriptChecker(
      this.accumulator,
      (text) => this.finalHandler.handleFinalTranscript(text),
      this.debugId
    );
    
    console.log(`[TranscriptHandler ${this.debugId}] Initialized with safety mechanisms`);
  }

  handleTranscriptDelta(deltaText: string): void {
    if (deltaText) {
      this.accumulator.accumulateText(deltaText);
      console.log(`[TranscriptHandler ${this.debugId}] 📝 Accumulating transcript delta: "${deltaText}"`);
      
      // Create a backup of the content
      this.safetyHandler.updateFailsafeBackup(this.accumulator.getAccumulatedText());
      
      // Check if we should save accumulated text based on time
      this.periodicChecker.checkAndSaveIfNeeded();
      this.stalenessMonitor.updateLastSaveTime();
      
      // Start emergency save timer if not already running
      this.safetyHandler.startEmergencySaveTimer();
    }
  }

  handleDirectTranscript(transcript: string): void {
    console.log(`[TranscriptHandler ${this.debugId}] 📝 Handling direct transcript: "${transcript.substring(0, 50)}..."`);
    this.directHandler.handleDirectTranscript(transcript);
    this.stalenessMonitor.updateLastSaveTime();
    
    // Update backup on direct transcript
    this.safetyHandler.updateFailsafeBackup(transcript);
  }

  handleFinalTranscript(text: string | undefined): void {
    console.log(`[TranscriptHandler ${this.debugId}] 📝 Handling final transcript: "${text?.substring(0, 50) || 'undefined'}..."`);
    
    // If no text provided but we have backup content, use that
    if (!text && this.safetyHandler.hasFailsafeBackupContent()) {
      console.log(`[TranscriptHandler ${this.debugId}] ⚠️ No text provided, using failsafe backup (${this.safetyHandler.getFailsafeBackupContent().length} chars)`);
      text = this.safetyHandler.getFailsafeBackupContent();
    }
    
    this.finalHandler.handleFinalTranscript(text);
    
    // Reset the last check time after handling a final transcript
    this.periodicChecker.updateLastCheckTime();
    this.stalenessMonitor.updateLastSaveTime();
    
    // Reset emergency timer since we just saved
    this.safetyHandler.resetEmergencySaveTimer();
  }

  handleSpeechStarted(): void {
    this.speechTracker.markSpeechStarted();
    console.log(`[TranscriptHandler ${this.debugId}] 🎙️ User speech started - preparing to capture transcript`);
    
    // Start emergency save timer when speech starts
    this.safetyHandler.startEmergencySaveTimer();
  }

  handleSpeechStopped(): void {
    console.log(`[TranscriptHandler ${this.debugId}] 🎤 User speech stopped - checking for transcript`);
    
    if (this.speechTracker.isSpeechDetected()) {
      if (this.hasAccumulatedTranscript()) {
        const accumulatedText = this.accumulator.getAccumulatedText();
        console.log(`[TranscriptHandler ${this.debugId}] 🔴 SPEECH STOPPED WITH TRANSCRIPT: "${accumulatedText.substring(0, 50)}..."`);
        
        // Save immediately when speech stops
        this.finalHandler.handleFinalTranscript(accumulatedText);
      } else if (this.safetyHandler.hasFailsafeBackupContent()) {
        // Use failsafe backup if we have no accumulated text
        console.log(`[TranscriptHandler ${this.debugId}] ⚠️ Speech stopped without transcript but failsafe available (${this.safetyHandler.getFailsafeBackupContent().length} chars)`);
        this.finalHandler.handleFinalTranscript(this.safetyHandler.getFailsafeBackupContent());
      } else {
        console.log(`[TranscriptHandler ${this.debugId}] ⚠️ Speech stopped but no transcript accumulated and no backup available`);
      }
      
      // Reset speech tracking after handling
      this.speechTracker.reset();
    }
    
    this.stalenessMonitor.updateLastSaveTime();
    
    // Stop emergency timer since speech has stopped
    this.safetyHandler.resetEmergencySaveTimer();
  }

  handleAudioBufferCommitted(): void {
    console.log(`[TranscriptHandler ${this.debugId}] Audio buffer committed, checking if we need to save partial transcript`);
    
    if (this.speechTracker.isSpeechDetected() && 
        this.hasAccumulatedTranscript() &&
        this.accumulator.isTranscriptStale()) {
      
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`[TranscriptHandler ${this.debugId}] 📝 Saving stale transcript on buffer commit: "${accumulatedText.substring(0, 50)}..."`);
      this.finalHandler.handleFinalTranscript(accumulatedText);
      this.stalenessMonitor.updateLastSaveTime();
      
      // Update backup
      this.safetyHandler.updateFailsafeBackup(accumulatedText);
    }
  }

  flushPendingTranscript(): void {
    if (this.hasAccumulatedTranscript()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`[TranscriptHandler ${this.debugId}] 🔴 FLUSHING PENDING TRANSCRIPT: "${accumulatedText.substring(0, 50)}..."`);
      this.finalHandler.handleFinalTranscript(accumulatedText);
      this.stalenessMonitor.updateLastSaveTime();
    } else if (this.safetyHandler.hasFailsafeBackupContent()) {
      // If no current content but we have a backup, use that as a safety measure
      console.log(`[TranscriptHandler ${this.debugId}] 🔄 No current transcript to flush, using failsafe backup (${this.safetyHandler.getFailsafeBackupContent().length} chars)`);
      this.finalHandler.handleFinalTranscript(this.safetyHandler.getFailsafeBackupContent());
    } else {
      console.log(`[TranscriptHandler ${this.debugId}] No pending transcript or backup to flush`);
    }
    
    // Reset emergency save timer
    this.safetyHandler.resetEmergencySaveTimer();
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
    this.safetyHandler.updateFailsafeBackup(this.accumulator.getAccumulatedText());
    
    // Clear the actual transcript
    this.accumulator.reset();
  }

  isUserSpeechDetected(): boolean {
    return this.speechTracker.isSpeechDetected();
  }
}
