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
  
  constructor(private messageQueue: MessageQueue) {
    this.accumulator = new TranscriptAccumulator();
    this.speechTracker = new SpeechStateTracker();
    this.notifier = new TranscriptNotifier();
    this.directHandler = new DirectTranscriptHandler(messageQueue);
    this.finalHandler = new FinalTranscriptHandler(messageQueue, this.accumulator);
  }

  handleTranscriptDelta(deltaText: string): void {
    if (deltaText) {
      this.accumulator.accumulateText(deltaText);
    }
  }

  handleDirectTranscript(transcript: string): void {
    this.directHandler.handleDirectTranscript(transcript);
  }

  handleFinalTranscript(text: string | undefined): void {
    this.finalHandler.handleFinalTranscript(text);
  }

  handleSpeechStarted(): void {
    this.speechTracker.markSpeechStarted();
    console.log("🎙️ User speech started - preparing to capture transcript");
  }

  handleSpeechStopped(): void {
    if (this.speechTracker.isSpeechDetected()) {
      console.log("🎤 User speech stopped - checking for transcript");
      
      if (this.hasAccumulatedTranscript()) {
        const accumulatedText = this.accumulator.getAccumulatedText();
        console.log(`🔴 SPEECH STOPPED WITH TRANSCRIPT: "${accumulatedText}"`);
        
        setTimeout(() => {
          if (this.hasAccumulatedTranscript()) {
            const currentText = this.accumulator.getAccumulatedText();
            this.finalHandler.handleFinalTranscript(currentText);
          }
        }, 300);
      }
    }
  }

  handleAudioBufferCommitted(): void {
    console.log("Audio buffer committed, checking if we need to save partial transcript");
    
    if (this.speechTracker.isSpeechDetected() && 
        this.hasAccumulatedTranscript() &&
        this.accumulator.isTranscriptStale()) {
      
      const accumulatedText = this.accumulator.getAccumulatedText();
      this.finalHandler.handleFinalTranscript(accumulatedText);
    }
  }

  flushPendingTranscript(): void {
    if (this.hasAccumulatedTranscript()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      this.finalHandler.handleFinalTranscript(accumulatedText);
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
}
