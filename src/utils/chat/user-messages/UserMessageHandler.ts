
import { Message, SaveMessageCallback } from '../../types';
import { toast } from 'sonner';

/**
 * Handler for managing user messages with improved reliability
 */
export class UserMessageHandler {
  private userTranscriptAccumulator: string = '';
  
  constructor(
    private saveMessageCallback: SaveMessageCallback
  ) {}
  
  /**
   * Save a user message with multiple retry attempts
   */
  async saveUserMessage(content: string, attempt: number = 1): Promise<void> {
    if (!content || content.trim() === '') {
      console.log("Skipping empty user message");
      return;
    }
    
    console.log(`[UserMessageHandler] Saving user message (attempt ${attempt}): ${content.substring(0, 30)}...`);
    const maxAttempts = 3;
    
    try {
      // Directly save the message via the callback
      const savedMsg = await this.saveMessageCallback({
        role: 'user',
        content: content
      });
      
      if (savedMsg && savedMsg.id) {
        console.log(`[UserMessageHandler] Direct save successful for message with ID: ${savedMsg.id}`);
        toast.success("User message saved to database", {
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          duration: 3000,
        });
      } else {
        throw new Error("Save returned null or missing ID");
      }
    } catch (err) {
      console.error(`[UserMessageHandler] Direct save failed (attempt ${attempt}):`, err);
      
      if (attempt < maxAttempts) {
        // Try again with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[UserMessageHandler] Will retry in ${delayMs}ms...`);
        
        setTimeout(() => {
          this.saveUserMessage(content, attempt + 1);
        }, delayMs);
      } else {
        // Fall back to message queue on direct save failure after all retries
        console.log("[UserMessageHandler] All direct save attempts failed");
        
        toast.error("Failed to save message", {
          description: err instanceof Error ? err.message : "Database error", 
          duration: 3000
        });
      }
    }
  }
  
  /**
   * Add content to transcript accumulator
   */
  accumulateTranscript(text: string): void {
    if (text && text.trim()) {
      this.userTranscriptAccumulator += text;
    }
  }
  
  /**
   * Get accumulated transcript
   */
  getAccumulatedTranscript(): string {
    return this.userTranscriptAccumulator;
  }
  
  /**
   * Clear accumulated transcript
   */
  clearAccumulatedTranscript(): void {
    this.userTranscriptAccumulator = '';
  }
  
  /**
   * Save transcript if it's not empty
   */
  saveTranscriptIfNotEmpty(): void {
    if (this.userTranscriptAccumulator && this.userTranscriptAccumulator.trim()) {
      console.log("Saving accumulated transcript:", this.userTranscriptAccumulator);
      this.saveUserMessage(this.userTranscriptAccumulator);
      this.userTranscriptAccumulator = '';
    }
  }
}
