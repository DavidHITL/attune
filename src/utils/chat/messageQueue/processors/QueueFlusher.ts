
import { QueuedMessage } from '../types';
import { SaveMessageCallback } from '../../../types';
import { toast } from 'sonner';
import { MessageSaver } from '../MessageSaver';

/**
 * Handles flushing the message queue and reporting status
 */
export class QueueFlusher {
  constructor(
    private messageQueue: QueuedMessage[],
    private saveMessageCallback: SaveMessageCallback,
    private messageSaver: MessageSaver
  ) {}
  
  /**
   * Process any remaining messages
   */
  async flushQueue(): Promise<void> {
    console.log(`Flushing message queue with ${this.messageQueue.length} messages and ${this.messageSaver.getActiveMessageSaves()} active saves`);
    
    // Wait for any in-progress saves to complete first
    if (this.messageSaver.getActiveMessageSaves() > 0) {
      console.log(`Waiting for ${this.messageSaver.getActiveMessageSaves()} active saves to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    const remainingMessages = [...this.messageQueue];
    this.messageQueue.length = 0; // Clear the queue
    
    for (const msg of remainingMessages) {
      try {
        console.log(`Processing message during flush: ${msg.role} - ${msg.content.substring(0, 30)}...`);
        const savedMessage = await this.saveMessageCallback({
          role: msg.role,
          content: msg.content
        });
        
        console.log(`Successfully saved message during flush with ID: ${savedMessage?.id || 'unknown'}`);
        
        // Show toast for user messages
        if (msg.role === 'user') {
          toast.success("User message saved during cleanup", {
            description: msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : ""),
            duration: 2000,
          });
        }
      } catch (error) {
        console.error("Error saving message during flush:", error);
        
        // Show error toast
        toast.error("Failed to save message during cleanup", {
          description: error instanceof Error ? error.message : "Database error",
          duration: 3000,
        });
      }
    }
    
    // Report on any pending user messages that never completed
    this.messageSaver.reportPendingMessages();
  }
}
