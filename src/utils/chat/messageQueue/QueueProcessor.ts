
import { SaveMessageCallback } from '../../types';
import { MessageSaver } from './MessageSaver';
import { QueuedMessage } from './types';
import { toast } from 'sonner';

/**
 * Handles processing message queue with reliability and error handling
 */
export class QueueProcessor {
  private messageQueue: QueuedMessage[] = [];
  private isProcessingQueue: boolean = false;
  private messageSaver: MessageSaver;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.messageSaver = new MessageSaver(saveMessageCallback);
  }
  
  /**
   * Add a message to the queue
   */
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    // Don't save empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return;
    }
    
    // Check for duplicate content
    if (this.messageSaver.isDuplicateContent(role, content)) {
      // Check for duplicate content in queue
      if (this.messageQueue.some(msg => 
        msg.role === role && 
        msg.content.trim() === content.trim()
      )) {
        console.log(`Duplicate ${role} message detected, skipping`);
        return;
      }
    }
    
    console.log(`Queued ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}", priority: ${priority}`);
    
    // For user messages or priority messages, try to save immediately
    if (role === 'user' || priority) {
      console.log(`Processing ${role} message with HIGH PRIORITY`);
      
      // Create a message ID to track this message
      const messageId = `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (role === 'user') {
        this.messageSaver.trackPendingUserMessage(messageId);
      }
      
      // Save message immediately with direct error handling
      this.saveMessageDirectly(role, content, messageId);
      
      // Show toast for queued user message
      if (role === 'user') {
        toast.info("Processing user message", {
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          id: `queue-${messageId}`,
          duration: 1500,
        });
      }
    } else {
      // For assistant messages, add to queue for processing
      this.messageQueue.push({ role, content, priority: false });
      console.log(`Queue length: ${this.messageQueue.length}`);
      this.processMessageQueue();
    }
  }
  
  /**
   * Save message directly with better error handling
   */
  private async saveMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string): Promise<void> {
    try {
      await this.messageSaver.saveMessageDirectly(role, content, messageId);
    } catch (error) {
      // Add to queue for retry through normal queue processing if direct save fails
      console.log(`Adding ${role} message to retry queue after direct save failures`);
      this.messageQueue.push({ role, content, priority: true });
      this.processMessageQueue();
    }
  }
  
  /**
   * Process message queue to ensure sequential saving
   */
  async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await this.messageSaver.saveMessageWithRetry(message.role, message.content);
        } catch (error) {
          console.error(`Failed to save ${message.role} message from queue:`, error);
          
          // Put back in queue for retry (at the beginning)
          console.log(`Re-queuing ${message.role} message after save failure`);
          this.messageQueue.unshift(message);
          
          // Wait a bit before retrying
          setTimeout(() => this.processMessageQueue(), 2000);
        }
      }
    } catch (error) {
      console.error("Error in message queue processing:", error);
    } finally {
      this.isProcessingQueue = false;
      
      // Process next message if any
      if (this.messageQueue.length > 0) {
        setTimeout(() => this.processMessageQueue(), 100); // Small delay between processing items
      }
    }
  }
  
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
    this.messageQueue = [];
    
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
  
  /**
   * Get queue status for debugging
   */
  getQueueStatus(): { queueLength: number, pendingUserMessages: number, activeSaves: number } {
    return {
      queueLength: this.messageQueue.length,
      pendingUserMessages: this.messageSaver.getPendingUserMessages(),
      activeSaves: this.messageSaver.getActiveMessageSaves()
    };
  }
}
