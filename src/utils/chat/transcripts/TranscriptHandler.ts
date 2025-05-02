
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
  // IMPROVED: More aggressive saving (500ms)
  private saveIntervalMs: number = 500; 
  private lastSaveTime: number = 0;
  private forceSaveAfterMs: number = 1000; // Force save after 1 second without saves
  
  constructor(private messageQueue: MessageQueue) {
    this.accumulator = new TranscriptAccumulator();
    this.speechTracker = new SpeechStateTracker();
    this.notifier = new TranscriptNotifier();
    this.directHandler = new DirectTranscriptHandler(messageQueue);
    this.finalHandler = new FinalTranscriptHandler(messageQueue, this.accumulator);
    
    // Set up periodic check for stale transcripts
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkForStalledTranscripts(), 1000);
    }
  }

  handleTranscriptDelta(deltaText: string): void {
    if (deltaText) {
      this.accumulator.accumulateText(deltaText);
      console.log(`📝 Accumulating transcript delta: "${deltaText}"`);
      
      // IMPROVED: Check if we should save accumulated text based on time
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
  }

  handleSpeechStopped(): void {
    console.log("🎤 User speech stopped - checking for transcript");
    
    if (this.speechTracker.isSpeechDetected()) {
      if (this.hasAccumulatedTranscript()) {
        const accumulatedText = this.accumulator.getAccumulatedText();
        console.log(`🔴 SPEECH STOPPED WITH TRANSCRIPT: "${accumulatedText}"`);
        
        // Save immediately when speech stops
        this.finalHandler.handleFinalTranscript(accumulatedText);
      } else {
        console.log("⚠️ Speech stopped but no transcript accumulated");
      }
      
      // Reset speech tracking after handling
      this.speechTracker.reset();
    }
    
    this.lastSaveTime = Date.now();
  }

  handleAudioBufferCommitted(): void {
    console.log("Audio buffer committed, checking if we need to save partial transcript");
    
    if (this.speechTracker.isSpeechDetected() && 
        this.hasAccumulatedTranscript() &&
        this.accumulator.isTranscriptStale()) {
      
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`📝 Saving stale transcript on buffer commit: "${accumulatedText}"`);
      this.finalHandler.handleFinalTranscript(accumulatedText);
      this.lastSaveTime = Date.now();
    }
  }

  flushPendingTranscript(): void {
    if (this.hasAccumulatedTranscript()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log(`🔴 FLUSHING PENDING TRANSCRIPT: "${accumulatedText}"`);
      this.finalHandler.handleFinalTranscript(accumulatedText);
      this.lastSaveTime = Date.now();
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
  
  // ADDED: Periodic check for stalled transcripts
  private checkForStalledTranscripts(): void {
    const now = Date.now();
    // If we have accumulated transcript and it's been more than 1 second since last save
    if (this.hasAccumulatedTranscript() && 
        (now - this.lastSaveTime > this.forceSaveAfterMs)) {
      console.log(`⚠️ Found stalled transcript (${now - this.lastSaveTime}ms since last save), force saving`);
      this.flushPendingTranscript();
    }
  }
}

