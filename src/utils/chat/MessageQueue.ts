import { Message, SaveMessageCallback } from '../types';
import { toast } from 'sonner';

export class MessageQueue {
  private messageQueue: { role: 'user' | 'assistant', content: string, priority: boolean }[] = [];
  private isProcessingQueue: boolean = false;
  private lastMessageSentTime: number = 0;
  private minTimeBetweenMessages: number = 500; // ms
  private userMessagesPending: Set<string> = new Set(); // Track pending user messages
  private activeMessageSaves: number = 0; // Counter for active save operations
  
  constructor(private saveMessageCallback: SaveMessageCallback) {}
  
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false) {
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
    
    console.log(`Queued ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}", priority: ${priority}`);
    
    // For user messages or priority messages, try to save immediately
    if (role === 'user' || priority) {
      console.log(`Processing ${role} message with HIGH PRIORITY`);
      
      // Create a message ID to track this message
      const messageId = `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (role === 'user') {
        this.userMessagesPending.add(messageId);
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
  
  // New method for direct message saving with better error handling
  private async saveMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string) {
    this.activeMessageSaves++;
    
    // For user messages, try multiple times with increasing delays
    const maxRetries = role === 'user' ? 3 : 1;
    let attempt = 0;
    let saved = false;
    
    while (!saved && attempt < maxRetries) {
      attempt++;
      try {
        console.log(`Directly saving ${role} message (attempt ${attempt}): "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
        
        // Save to database
        const savedMessage = await this.saveMessageCallback({
          role: role,
          content: content
        });
        
        console.log(`Successfully saved ${role} message to database`, 
          savedMessage ? `with ID: ${savedMessage.id}` : "(no ID returned)");
          
        saved = true;
        
        if (messageId && role === 'user') {
          this.userMessagesPending.delete(messageId);
          console.log(`Remaining pending user messages: ${this.userMessagesPending.size}`);
          
          // Show success toast for user message
          toast.success("User message saved to database", {
            description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
            id: `save-${messageId}`,
            duration: 2000,
          });
        }
        
        break; // Exit retry loop on success
      } catch (error) {
        console.error(`Error directly saving ${role} message (attempt ${attempt}):`, error);
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // Increase delay with each retry
          console.log(`Will retry in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Add to queue for retry through normal queue processing
          console.log(`Adding ${role} message to retry queue after all direct save failures`);
          this.messageQueue.push({ role, content, priority: true });
          this.processMessageQueue();
          
          if (messageId && role === 'user') {
            // Keep track that we still have a pending message
            console.log(`User message ${messageId} failed to save directly after ${maxRetries} attempts, moved to retry queue`);
            
            // Show error toast for failed user message
            toast.error(`Failed to save user message after ${maxRetries} attempts, retrying via queue`, {
              description: error instanceof Error ? error.message : "Database error",
              id: `error-${messageId}`,
              duration: 3000,
            });
          }
        }
      }
    }
    
    this.activeMessageSaves--;
  }

  // Save message asynchronously with error handling
  private async saveMessageAsync(message: { role: 'user' | 'assistant', content: string, priority: boolean }) {
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
    console.log(`Flushing message queue with ${this.messageQueue.length} messages and ${this.activeMessageSaves} active saves`);
    
    // Wait for any in-progress saves to complete first
    if (this.activeMessageSaves > 0) {
      console.log(`Waiting for ${this.activeMessageSaves} active saves to complete...`);
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
    if (this.userMessagesPending.size > 0) {
      console.warn(`WARNING: ${this.userMessagesPending.size} user messages may not have been saved properly`);
      toast.warning(`${this.userMessagesPending.size} user messages may not have been saved`, {
        duration: 3000,
      });
    }
  }
  
  // Get queue status for debugging
  getQueueStatus(): { queueLength: number, pendingUserMessages: number, activeSaves: number } {
    return {
      queueLength: this.messageQueue.length,
      pendingUserMessages: this.userMessagesPending.size,
      activeSaves: this.activeMessageSaves
    };
  }
}
