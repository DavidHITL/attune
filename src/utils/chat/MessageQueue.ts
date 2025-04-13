import { Message, SaveMessageCallback } from '../types';

export class MessageQueue {
  private messageQueue: { role: 'user' | 'assistant', content: string }[] = [];
  private isProcessingQueue: boolean = false;
  private lastMessageSentTime: number = 0;
  private minTimeBetweenMessages: number = 500; // ms
  private userMessagesPending: Set<string> = new Set(); // Track pending user messages
  
  constructor(private saveMessageCallback: SaveMessageCallback) {}
  
  queueMessage(role: 'user' | 'assistant', content: string) {
    // Don't save empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return;
    }
    
    // Check if we've saved the same message recently (debounce)
    const now = Date.now();
    if (now - this.lastMessageSentTime < this.minTimeBetweenMessages) {
      console.log(`Message received too quickly after previous one, checking for duplicates`);
      
      // Check for duplicate content in queue
      if (this.messageQueue.some(msg => 
        msg.role === role && 
        msg.content.trim() === content.trim()
      )) {
        console.log(`Duplicate ${role} message detected, skipping`);
        return;
      }
    }
    
    this.lastMessageSentTime = now;
    
    console.log(`Queued ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
    
    // For user messages, try to save immediately with high priority
    if (role === 'user') {
      console.log(`Processing user message with high priority`);
      
      // Create a message ID to track this message
      const messageId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      this.userMessagesPending.add(messageId);
      
      // Save user message immediately with direct error handling
      this.saveMessageDirectly(role, content, messageId);
    } else {
      // For assistant messages, add to queue for processing
      this.messageQueue.push({ role, content });
      console.log(`Queue length: ${this.messageQueue.length}`);
      this.processMessageQueue();
    }
  }
  
  // New method for direct message saving with better error handling
  private async saveMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string) {
    try {
      console.log(`Directly saving ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      
      // Save to database
      const savedMessage = await this.saveMessageCallback({
        role: role,
        content: content
      });
      
      console.log(`Successfully saved ${role} message to database`, 
        savedMessage ? `with ID: ${savedMessage.id}` : "(no ID returned)");
        
      if (messageId) {
        this.userMessagesPending.delete(messageId);
        console.log(`Remaining pending user messages: ${this.userMessagesPending.size}`);
      }
    } catch (error) {
      console.error(`Error directly saving ${role} message:`, error);
      
      // Add to queue for retry
      console.log(`Adding ${role} message to retry queue after direct save failure`);
      this.messageQueue.push({ role, content });
      this.processMessageQueue();
      
      if (messageId) {
        // Keep track that we still have a pending message
        console.log(`User message ${messageId} failed to save directly, moved to retry queue`);
      }
    }
  }

  // Save message asynchronously with error handling
  private async saveMessageAsync(message: { role: 'user' | 'assistant', content: string }) {
    try {
      console.log(`Saving ${message.role} message from queue: "${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}"`);
      const savedMessage = await this.saveMessageCallback({
        role: message.role,
        content: message.content
      });
      console.log(`Successfully saved ${message.role} message to database`, 
        savedMessage ? `with ID: ${savedMessage.id}` : "(no ID returned)");
    } catch (error) {
      console.error(`Error saving ${message.role} message from queue:`, error);
      
      // Put back in queue for retry (at the beginning)
      console.log(`Re-queuing ${message.role} message after save failure`);
      this.messageQueue.unshift(message);
      
      // Wait a bit before retrying
      setTimeout(() => this.processMessageQueue(), 2000);
    }
  }

  // Process message queue to ensure sequential saving
  private async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      const message = this.messageQueue.shift();
      if (message) {
        console.log(`Processing ${message.role} message from queue: "${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}"`);
        
        // Retry loop for saving messages
        let attempts = 0;
        const maxAttempts = 3;
        let saved = false;
        
        while (!saved && attempts < maxAttempts) {
          try {
            const savedMessage = await this.saveMessageCallback({
              role: message.role,
              content: message.content
            });
            console.log(`Successfully saved ${message.role} message to database (attempt ${attempts + 1})`, 
              savedMessage ? `with ID: ${savedMessage.id}` : "(no ID returned)");
            saved = true;
          } catch (error) {
            attempts++;
            console.error(`Error saving message (attempt ${attempts}):`, error);
            if (attempts < maxAttempts) {
              console.log(`Retrying in ${attempts * 1000}ms...`);
              await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            } else {
              console.error(`Failed to save message after ${maxAttempts} attempts`);
            }
          }
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
  
  // Process any remaining messages synchronously
  async flushQueue(): Promise<void> {
    console.log(`Flushing message queue with ${this.messageQueue.length} messages`);
    const remainingMessages = [...this.messageQueue];
    this.messageQueue = [];
    
    for (const msg of remainingMessages) {
      try {
        console.log(`Processing message during flush: ${msg.role} - ${msg.content.substring(0, 30)}...`);
        await this.saveMessageCallback({
          role: msg.role,
          content: msg.content
        });
        console.log(`Successfully saved message during flush`);
      } catch (error) {
        console.error("Error saving message during flush:", error);
      }
    }
    
    // Report on any pending user messages that never completed
    if (this.userMessagesPending.size > 0) {
      console.warn(`WARNING: ${this.userMessagesPending.size} user messages may not have been saved properly`);
    }
  }
  
  // Get queue status for debugging
  getQueueStatus(): { queueLength: number, pendingUserMessages: number } {
    return {
      queueLength: this.messageQueue.length,
      pendingUserMessages: this.userMessagesPending.size
    };
  }
}
