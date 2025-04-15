
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
   * Process any remaining messages with improved timing
   */
  async flushQueue(): Promise<void> {
    const initialQueueLength = this.messageQueue.length;
    const initialActiveSaves = this.messageSaver.getActiveMessageSaves();
    
    console.log(`Starting queue flush with ${initialQueueLength} messages and ${initialActiveSaves} active saves`);
    
    // If no immediate messages but active saves, wait briefly
    if (initialQueueLength === 0 && initialActiveSaves > 0) {
      console.log(`No queued messages but ${initialActiveSaves} active saves - waiting briefly...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Wait for any in-progress saves to complete
    if (this.messageSaver.getActiveMessageSaves() > 0) {
      console.log(`Waiting for ${this.messageSaver.getActiveMessageSaves()} active saves to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Additional wait if queue is empty to catch any last-minute additions
    if (this.messageQueue.length === 0) {
      console.log('Queue empty, allowing extra time for pending messages...');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const remainingMessages = [...this.messageQueue];
    this.messageQueue.length = 0; // Clear the queue
    
    console.log(`Processing final flush with ${remainingMessages.length} messages`);
    
    for (const msg of remainingMessages) {
      try {
        console.log(`Processing message during flush: ${msg.role} - ${msg.content.substring(0, 30)}...`);
        const savedMessage = await this.saveMessageCallback({
          role: msg.role,
          content: msg.content
        });
        
        console.log(`Successfully saved message during flush with ID: ${savedMessage?.id || 'unknown'}`);
        
        if (msg.role === 'user') {
          toast.success("User message saved during cleanup", {
            description: msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : ""),
            duration: 2000,
          });
        }
      } catch (error) {
        console.error("Error saving message during flush:", error);
        
        toast.error("Failed to save message during cleanup", {
          description: error instanceof Error ? error.message : "Database error",
          duration: 3000,
        });
      }
    }
    
    // Final check for any messages that might have been added during processing
    const finalCheck = this.messageQueue.length;
    if (finalCheck > 0) {
      console.log(`Found ${finalCheck} additional messages during flush - processing them...`);
      await this.flushQueue(); // Recursively process any new messages
    }
    
    // Report on any pending user messages that never completed
    this.messageSaver.reportPendingMessages();
  }
}

