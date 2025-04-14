
import { Message, SaveMessageCallback } from '../../types';
import { toast } from 'sonner';
import { MessageValidator } from './validators/MessageValidator';
import { MessageSaver } from './savers/MessageSaver';
import { TranscriptAccumulator } from './accumulators/TranscriptAccumulator';

/**
 * Handler for managing user messages with improved reliability
 */
export class UserMessageHandler {
  private messageCount: number = 0;
  private validator: MessageValidator;
  private saver: MessageSaver;
  private accumulator: TranscriptAccumulator;
  
  constructor(
    private saveMessageCallback: SaveMessageCallback
  ) {
    this.validator = new MessageValidator();
    this.saver = new MessageSaver(saveMessageCallback);
    this.accumulator = new TranscriptAccumulator();
  }
  
  /**
   * Save a user message with multiple retry attempts and duplicate prevention
   */
  async saveUserMessage(content: string): Promise<void> {
    // Skip empty messages
    if (!this.validator.isValidMessage(content)) {
      console.log("Skipping empty user message");
      return;
    }
    
    // Skip if we've already processed this message recently
    if (this.validator.isDuplicate(content)) {
      console.log(`Skipping duplicate user message: ${content.substring(0, 50)}...`);
      return;
    }
    
    // Track this message to prevent duplicates
    this.validator.markAsProcessed(content);
    
    // Generate a unique ID for tracking this message
    const messageId = `user-${Date.now()}-${this.messageCount++}`;
    this.saver.trackPendingMessage(messageId);
    
    // Save the message with retry logic
    await this.saver.saveUserMessage(content, messageId);
  }
  
  /**
   * Add content to transcript accumulator
   */
  accumulateTranscript(text: string): void {
    this.accumulator.accumulateTranscript(text);
  }
  
  /**
   * Get accumulated transcript
   */
  getAccumulatedTranscript(): string {
    return this.accumulator.getAccumulatedTranscript();
  }
  
  /**
   * Clear accumulated transcript
   */
  clearAccumulatedTranscript(): void {
    this.accumulator.clearAccumulatedTranscript();
  }
  
  /**
   * Save transcript if it's not empty
   */
  saveTranscriptIfNotEmpty(): void {
    if (this.accumulator.hasContent()) {
      const transcript = this.accumulator.getAccumulatedTranscript();
      console.log(`Saving accumulated transcript (${transcript.length} chars): "${transcript.substring(0, 30)}${transcript.length > 30 ? "..." : ""}"`);
      this.saveUserMessage(transcript);
      this.accumulator.clearAccumulatedTranscript();
    } else {
      console.log("No accumulated transcript to save");
    }
  }
  
  /**
   * Clean up old processed messages to prevent memory leaks
   */
  cleanupProcessedMessages(): void {
    this.validator.cleanup();
  }
  
  /**
   * Get pending message count
   */
  getPendingMessageCount(): number {
    return this.saver.getPendingMessageCount();
  }
}
