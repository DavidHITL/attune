
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
  // More aggressive saving (300ms)
  private saveIntervalMs: number = 300; 
  private lastSaveTime: number = 0;
  private forceSaveAfterMs: number = 800; // Force save after 800ms without saves
  private speechEndedTimer: number | null = null;
  
  constructor(private messageQueue: MessageQueue) {
    this.accumulator = new TranscriptAccumulator();
    this.speechTracker = new SpeechStateTracker();
    this.notifier = new TranscriptNotifier();
    this.directHandler = new DirectTranscriptHandler(messageQueue);
    this.finalHandler = new FinalTranscriptHandler(messageQueue, this.accumulator);
    
    // Set up periodic check for stale transcripts
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkForStalledTranscripts(), 800);
    }
  }

  handleTranscriptDelta(deltaText: string): void {
    if (deltaText) {
      this.accumulator.accumulateText(deltaText);
      console.log(`📝 Accumulating transcript delta: "${deltaText}"`);
      
      // Clear any pending speech ended timer when we get new deltas
      if (this.speechEndedTimer) {
        console.log("🔄 Clearing speech ended timer due to new transcript data");
        clearTimeout(this.speechEndedTimer);
        this.speechEndedTimer = null;
      }
      
      // Check if we should save accumulated text based on time
      const now = Date.now();
      if (now - this.lastCheckTime > this.saveIntervalMs && this.hasAccumulatedTranscript()) {
        console.log("🕒 Time threshold reached, saving accumulated transcript");
        const accumulatedText = this.accumulator.getAccumulatedText();
        this.finalHandler.handleFinalTranscript(accumulatedText);
        this.lastCheckTime = now;
        this.lastSaveTime = now;
      }
    }
  }

  handleDirectTranscript(transcript: string): void {
    console.log(`📝 Handling direct transcript: "${transcript.substring(0, 50)}..."`);
    this.directHandler.handleDirectTranscript(transcript);
    this.lastSaveTime = Date.now();
  }

  handleFinalTranscript(text: string | undefined): void {
    console.log(`📝 Handling final transcript: "${text?.substring(0, 50) || 'undefined'}..."`);
    this.finalHandler.handleFinalTranscript(text);
    
    // Reset the last check time after handling a final transcript
    this.lastCheckTime = Date.now();
    this.lastSaveTime = Date.now();
  }

  handleSpeechStarted(): void {
    this.speechTracker.markSpeechStarted();
    console.log("🎙️ User speech started - preparing to capture transcript");
    
    // Clear any pending speech ended timer
    if (this.speechEndedTimer) {
      clearTimeout(this.speechEndedTimer);
      this.speechEndedTimer = null;
    }
  }

  handleSpeechStopped(): void {
    console.log("🎤 User speech stopped - scheduling final transcript capture");
    
    // Set a short timer to allow any final deltas to arrive before saving
    if (this.speechEndedTimer === null) {
      this.speechEndedTimer = setTimeout(() => {
        console.log("⏱️ Speech ended timer triggered - capturing final transcript");
        this.captureAndSaveFinalTranscript();
        this.speechEndedTimer = null;
      }, 500) as unknown as number; // Short delay to ensure all deltas arrive
    }
  }
  
  private captureAndSaveFinalTranscript(): void {
    if (this.speechTracker.isSpeechDetected()) {
      if (this.hasAccumulatedTranscript()) {
        const accumulatedText = this.accumulator.getAccumulatedText();
        console.log(`🔴 SPEECH ENDED WITH FINAL TRANSCRIPT: "${accumulatedText.substring(0, 50)}${accumulatedText.length > 50 ? '...' : ''}"`);
        
        // Save with explicit user role through the final handler
        this.finalHandler.handleFinalTranscript(accumulatedText);
        
        // Reset accumulator after capturing final transcript
        this.accumulator.reset();
      } else {
        console.log("⚠️ Speech stopped but no transcript accumulated");
      }
      
      // Reset speech tracking after handling
      this.speechTracker.reset();
    }
    
    this.lastSaveTime = Date.now();
  }

  handleAudioBufferCommitted(): void {
    console.log("Audio buffer committed, checking for speech finalization");
    
    // If speech was detected but no more deltas for some time, this could be the end
    if (this.speechTracker.isSpeechDetected() && 
        this.hasAccumulatedTranscript() &&
        Date.now() - this.lastSaveTime > this.forceSaveAfterMs) {
        
      console.log("📢 Audio buffer committed with no recent deltas - treating as speech end");
      this.captureAndSaveFinalTranscript();
    }
  }

  flushPendingTranscript(): void {
    if (this.hasAccumulatedTranscript()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`🔴 FLUSHING PENDING TRANSCRIPT: "${accumulatedText}"`);
      this.finalHandler.handleFinalTranscript(accumulatedText);
      this.lastSaveTime = Date.now();
      
      // Clear the accumulator after flushing
      this.accumulator.reset();
    } else {
      console.log("No pending transcript to flush");
    }
  }

  private hasAccumulatedTranscript(): boolean {
    const text = this.accumulator.getAccumulatedText();
    return !!text && text.trim() !== '';
  }

  getTranscript(): string {
    return this.accumulator.getAccumulatedText();
  }

  clearTranscript(): void {
    this.accumulator.reset();
  }

  isUserSpeechDetected(): boolean {
    return this.speechTracker.isSpeechDetected();
  }
  
  // Periodic check for stalled transcripts
  private checkForStalledTranscripts(): void {
    const now = Date.now();
    // If we have accumulated transcript and it's been more than forceSaveAfterMs since last save
    if (this.hasAccumulatedTranscript() && 
        (now - this.lastSaveTime > this.forceSaveAfterMs) &&
        this.speechTracker.isSpeechDetected()) {
      console.log(`⚠️ Found stalled transcript (${now - this.lastSaveTime}ms since last save), force saving`);
      this.captureAndSaveFinalTranscript();
    }
  }
}
