
import { Message, SaveMessageCallback } from '../../types';
import { toast } from 'sonner';

/**
 * Handler for managing user messages with improved reliability
 */
export class UserMessageHandler {
  private userTranscriptAccumulator: string = '';
  private pendingMessages: Set<string> = new Set();
  private messageCount: number = 0;
  
  constructor(
    private saveMessageCallback: SaveMessageCallback
  ) {}
  
  /**
   * Save a user message with multiple retry attempts
   */
  async saveUserMessage(content: string, attempt: number = 1): Promise<void> {
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log("Skipping empty user message");
      return;
    }
    
    // Generate a unique ID for tracking this message
    const messageId = `user-${Date.now()}-${this.messageCount++}`;
    this.pendingMessages.add(messageId);
    
    console.log(`[UserMessageHandler] Saving user message ${messageId} (attempt ${attempt}): ${content.substring(0, 30)}...`);
    const maxAttempts = 3;
    
    try {
      // Show toast for message processing
      toast.loading(`Saving user message...`, {
        id: messageId,
        duration: 5000
      });
      
      // Directly save the message via the callback
      const savedMsg = await this.saveMessageCallback({
        role: 'user',
        content: content
      });
      
      if (savedMsg && savedMsg.id) {
        console.log(`[UserMessageHandler] Message ${messageId} saved successfully with ID: ${savedMsg.id}`);
        this.pendingMessages.delete(messageId);
        
        // Update toast to success
        toast.success(`Message saved`, {
          id: messageId,
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          duration: 3000
        });
        
        return;
      } else {
        throw new Error("Save returned null or missing ID");
      }
    } catch (err) {
      console.error(`[UserMessageHandler] Save failed for message ${messageId} (attempt ${attempt}):`, err);
      
      if (attempt < maxAttempts) {
        // Try again with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[UserMessageHandler] Will retry message ${messageId} in ${delayMs}ms...`);
        
        // Update toast to retry state
        toast.loading(`Retrying save...`, {
          id: messageId,
          duration: delayMs + 3000
        });
        
        setTimeout(() => {
          this.saveUserMessage(content, attempt + 1);
        }, delayMs);
      } else {
        console.error(`[UserMessageHandler] All ${maxAttempts} attempts failed for message ${messageId}`);
        this.pendingMessages.delete(messageId);
        
        // Update toast to error
        toast.error("Failed to save message", {
          id: messageId,
          description: err instanceof Error ? err.message : "Database error",
          duration: 4000
        });
      }
    }
  }
  
  /**
   * Add content to transcript accumulator
   */
  accumulateTranscript(text: string): void {
    if (text === '') {
      // Reset accumulator
      this.userTranscriptAccumulator = '';
      return;
    }
    
    if (text && text.trim()) {
      this.userTranscriptAccumulator += text;
      console.log(`Accumulating user transcript (${this.userTranscriptAccumulator.length} chars): "${this.userTranscriptAccumulator.substring(0, 30)}${this.userTranscriptAccumulator.length > 30 ? "..." : ""}"`);
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
      console.log(`Saving accumulated transcript (${this.userTranscriptAccumulator.length} chars): "${this.userTranscriptAccumulator.substring(0, 30)}${this.userTranscriptAccumulator.length > 30 ? "..." : ""}"`);
      this.saveUserMessage(this.userTranscriptAccumulator);
      this.userTranscriptAccumulator = '';
    } else {
      console.log("No accumulated transcript to save");
    }
  }
  
  /**
   * Get pending message count
   */
  getPendingMessageCount(): number {
    return this.pendingMessages.size;
  }
}
