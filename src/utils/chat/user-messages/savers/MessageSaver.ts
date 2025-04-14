
import { Message, SaveMessageCallback } from '../../../types';
import { toast } from 'sonner';

/**
 * Handles saving user messages with retry logic
 */
export class MessageSaver {
  private pendingMessages: Set<string> = new Set();
  
  constructor(
    private saveMessageCallback: SaveMessageCallback
  ) {}
  
  /**
   * Save a user message with multiple retry attempts
   */
  async saveUserMessage(content: string, messageId: string, attempt: number = 1): Promise<Message | null> {
    console.log(`[MessageSaver] Saving user message ${messageId} (attempt ${attempt}): ${content.substring(0, 30)}...`);
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
        console.log(`[MessageSaver] Message ${messageId} saved successfully with ID: ${savedMsg.id}`);
        this.pendingMessages.delete(messageId);
        
        // Update toast to success
        toast.success(`Message saved`, {
          id: messageId,
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          duration: 3000
        });
        
        return savedMsg;
      } else {
        throw new Error("Save returned null or missing ID");
      }
    } catch (err) {
      console.error(`[MessageSaver] Save failed for message ${messageId} (attempt ${attempt}):`, err);
      
      if (attempt < maxAttempts) {
        // Try again with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[MessageSaver] Will retry message ${messageId} in ${delayMs}ms...`);
        
        // Update toast to retry state
        toast.loading(`Retrying save...`, {
          id: messageId,
          duration: delayMs + 3000
        });
        
        // Return promise for retry
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await this.saveUserMessage(content, messageId, attempt + 1);
            resolve(result);
          }, delayMs);
        });
      } else {
        console.error(`[MessageSaver] All ${maxAttempts} attempts failed for message ${messageId}`);
        this.pendingMessages.delete(messageId);
        
        // Update toast to error
        toast.error("Failed to save message", {
          id: messageId,
          description: err instanceof Error ? err.message : "Database error",
          duration: 4000
        });
        
        return null;
      }
    }
  }
  
  /**
   * Track a pending message
   */
  trackPendingMessage(messageId: string): void {
    this.pendingMessages.add(messageId);
  }
  
  /**
   * Get pending message count
   */
  getPendingMessageCount(): number {
    return this.pendingMessages.size;
  }
}
