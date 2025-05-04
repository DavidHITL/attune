
import { Message, SaveMessageCallback } from '../../../types';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

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
    const maxAttempts = 3;
    
    try {
      // Show toast for message processing
      toast.loading(`Saving user message...`, {
        id: messageId,
        duration: 5000
      });
      
      // Use the central message save service
      const savedMsg = await messageSaveService.saveMessageToDatabase({
        role: 'user',
        content: content
      });
      
      if (savedMsg && savedMsg.id) {
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
      if (attempt < maxAttempts) {
        // Try again with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        
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
