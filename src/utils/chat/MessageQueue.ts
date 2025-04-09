
import { Message, SaveMessageCallback } from '../types';

export class MessageQueue {
  private messageQueue: { role: 'user' | 'assistant', content: string }[] = [];
  private isProcessingQueue: boolean = false;
  private lastMessageSentTime: number = 0;
  private minTimeBetweenMessages: number = 500; // ms
  
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
    
    this.messageQueue.push({ role, content });
    console.log(`Queued ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
    console.log(`Queue length: ${this.messageQueue.length}`);
    this.processMessageQueue();
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
            await this.saveMessageCallback({
              role: message.role,
              content: message.content
            });
            console.log(`Successfully saved ${message.role} message to database (attempt ${attempts + 1})`);
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
  }
}
