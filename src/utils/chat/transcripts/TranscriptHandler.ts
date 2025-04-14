
import { MessageQueue } from '../messageQueue';
import { toast } from 'sonner';
import { TranscriptAccumulator } from './handlers/TranscriptAccumulator';
import { DuplicateTracker } from './handlers/DuplicateTracker';
import { SpeechStateTracker } from './handlers/SpeechStateTracker';
import { TranscriptNotifier } from './handlers/TranscriptNotifier';

/**
 * Main handler for capturing and processing user transcripts
 * Coordinates multiple specialized utilities for transcript handling
 */
export class TranscriptHandler {
  private accumulator: TranscriptAccumulator;
  private duplicateTracker: DuplicateTracker;
  private speechTracker: SpeechStateTracker;
  private notifier: TranscriptNotifier;
  
  constructor(private messageQueue: MessageQueue) {
    this.accumulator = new TranscriptAccumulator();
    this.duplicateTracker = new DuplicateTracker();
    this.speechTracker = new SpeechStateTracker();
    this.notifier = new TranscriptNotifier();
  }

  /**
   * Process transcript events and accumulate transcript text
   */
  handleTranscriptDelta(deltaText: string): void {
    if (deltaText) {
      this.accumulator.accumulateText(deltaText);
    }
  }
  
  /**
   * Process direct transcript events with high priority
   */
  handleDirectTranscript(transcript: string): void {
    if (transcript && transcript.trim()) {
      // Check for duplicates
      if (this.duplicateTracker.isDuplicate(transcript)) {
        console.log("Duplicate transcript detected, skipping:", transcript.substring(0, 50));
        return;
      }
      
      console.log("🔴 DIRECT TRANSCRIPT DETECTED:", transcript.substring(0, 100));
      
      this.messageQueue.queueMessage('user', transcript, true); // High priority save
      this.duplicateTracker.markAsProcessed(transcript);
      
      this.notifier.notifyTranscriptCaptured(transcript);
    }
  }
  
  /**
   * Process final transcript completions
   */
  handleFinalTranscript(text: string | undefined): void {
    // Log event for debugging
    console.log("🔍 HANDLING FINAL TRANSCRIPT:", text);
    
    // Get the final transcript and save it
    const content = text;
    
    if (content && content.trim()) {
      // Check for duplicates
      if (this.duplicateTracker.isDuplicate(content)) {
        console.log("Duplicate final transcript detected, skipping:", content.substring(0, 50));
        return;
      }
      
      console.log("🔴 FINAL TRANSCRIPT SAVING:", content);
      
      // CRITICAL FIX: Use both queuing and direct API call for maximum reliability
      this.messageQueue.queueMessage('user', content, true); // High priority queue
      
      this.duplicateTracker.markAsProcessed(content);
      
      // Reset transcript accumulator
      this.accumulator.reset();
      this.speechTracker.markSpeechStopped();
      
      this.notifier.notifyTranscriptSaved(content);
    } else if (this.hasAccumulatedTranscript()) {
      // Fallback to accumulated transcript if final is missing
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log("🔴 USING ACCUMULATED TRANSCRIPT:", accumulatedText);
      
      // Check for duplicates
      if (!this.duplicateTracker.isDuplicate(accumulatedText)) {
        this.messageQueue.queueMessage('user', accumulatedText, true); // High priority save
        this.duplicateTracker.markAsProcessed(accumulatedText);
        
        this.notifier.notifyTranscriptSaved(accumulatedText, "accumulated");
      }
      
      this.accumulator.reset();
      this.speechTracker.markSpeechStopped();
    } else {
      console.log("Empty user transcript, not saving");
      this.speechTracker.markSpeechStopped();
    }
    
    // Clean up transcript processing to prevent memory leaks
    this.duplicateTracker.cleanup();
  }
  
  /**
   * Handle speech started events
   */
  handleSpeechStarted(): void {
    this.speechTracker.markSpeechStarted();
    console.log("🎙️ User speech started - preparing to capture transcript");
  }
  
  /**
   * Handle speech stopped events
   */
  handleSpeechStopped(): void {
    if (this.speechTracker.isSpeechDetected()) {
      console.log("🎤 User speech stopped - checking for transcript");
      
      // If we have transcript, save it after a small delay to allow for final transcripts
      if (this.hasAccumulatedTranscript()) {
        const accumulatedText = this.accumulator.getAccumulatedText();
        console.log(`🔴 SPEECH STOPPED WITH TRANSCRIPT: "${accumulatedText}"`);
        
        setTimeout(() => {
          if (this.hasAccumulatedTranscript()) {
            const currentText = this.accumulator.getAccumulatedText();
            console.log("🔴 SAVING SPEECH-STOPPED TRANSCRIPT:", currentText);
            
            // Check for duplicates
            if (!this.duplicateTracker.isDuplicate(currentText)) {
              this.messageQueue.queueMessage('user', currentText, true); // High priority
              this.duplicateTracker.markAsProcessed(currentText);
              
              this.notifier.notifyTranscriptSaved(currentText);
              
              this.accumulator.reset();
            }
            
            this.speechTracker.markSpeechStopped();
          }
        }, 300);
      }
    }
  }
  
  /**
   * Handle committed audio buffer events
   */
  handleAudioBufferCommitted(): void {
    console.log("Audio buffer committed, checking if we need to save partial transcript");
    
    // If user was speaking and we have transcript, consider saving it
    if (this.speechTracker.isSpeechDetected() && 
        this.hasAccumulatedTranscript() &&
        this.accumulator.isTranscriptStale()) {
      
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log("🔴 SAVING TRANSCRIPT FROM COMMITTED BUFFER:", accumulatedText);
      
      // Check for duplicates
      if (!this.duplicateTracker.isDuplicate(accumulatedText)) {
        this.messageQueue.queueMessage('user', accumulatedText, true);
        this.duplicateTracker.markAsProcessed(accumulatedText);
        
        this.notifier.notifyTranscriptSaved(accumulatedText, "buffer");
        
        this.accumulator.reset();
      }
    }
  }
  
  /**
   * For cleanup - save any pending transcript
   */
  flushPendingTranscript(): void {
    if (this.hasAccumulatedTranscript()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log("🔴 SAVING FINAL TRANSCRIPT DURING DISCONNECT:", accumulatedText);
      
      // Check for duplicates
      if (!this.duplicateTracker.isDuplicate(accumulatedText)) {
        this.messageQueue.queueMessage('user', accumulatedText, true); // High priority
        this.duplicateTracker.markAsProcessed(accumulatedText);
        
        this.notifier.notifyTranscriptSaved(accumulatedText, "disconnect");
      }
    }
  }
  
  /**
   * Check if we have accumulated transcript
   */
  private hasAccumulatedTranscript(): boolean {
    const text = this.accumulator.getAccumulatedText();
    return !!text && text.trim() !== '';
  }
  
  /**
   * Get the current accumulated transcript
   */
  getTranscript(): string {
    return this.accumulator.getAccumulatedText();
  }
  
  /**
   * Clear the current transcript
   */
  clearTranscript(): void {
    this.accumulator.reset();
  }
  
  /**
   * Get user speech detected state
   */
  isUserSpeechDetected(): boolean {
    return this.speechTracker.isSpeechDetected();
  }
}
