import { Message, SaveMessageCallback } from '../../types';
import { toast } from 'sonner';

/**
 * Handles the actual saving of messages with retry logic
 */
export class MessageSaver {
  private activeMessageSaves: number = 0;
  private userMessagesPending: Set<string> = new Set();
  private minTimeBetweenMessages: number = 500; // ms
  private lastMessageSentTime: number = 0;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {}

  /**
   * Directly save a message with retry logic
   */
  async saveMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string): Promise<Message | null> {
    this.activeMessageSaves++;
    
    // For user messages, try multiple times with increasing delays
    const maxRetries = role === 'user' ? 3 : 1;
    let attempt = 0;
    let saved = false;
    let savedMessage: Message | null = null;
    
    while (!saved && attempt < maxRetries) {
      attempt++;
      try {
        console.log(`Directly saving ${role} message (attempt ${attempt}): "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
        
        // Save to database
        savedMessage = await this.saveMessageCallback({
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
          if (messageId && role === 'user') {
            // Keep track that we still have a pending message
            console.log(`User message ${messageId} failed to save directly after ${maxRetries} attempts`);
            
            // Show error toast for failed user message
            toast.error(`Failed to save user message after ${maxRetries} attempts`, {
              description: error instanceof Error ? error.message : "Database error",
              id: `error-${messageId}`,
              duration: 3000,
            });
          }
          throw error;
        }
      }
    }
    
    this.activeMessageSaves--;
    return savedMessage;
  }
  
  /**
   * Save message with exponential backoff retry logic
   */
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    try {
      console.log(`Saving ${role} message with retry: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      
      // Try multiple attempts with increasing delays
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const savedMessage = await this.saveMessageCallback({
            role: role,
            content: content
          });
          
          console.log(`Successfully saved ${role} message to database (attempt ${attempts + 1})`, 
            savedMessage ? `with ID: ${savedMessage.id}` : "(no ID returned)");
          
          return savedMessage;
        } catch (error) {
          attempts++;
          console.error(`Error saving message (attempt ${attempts}):`, error);
          
          if (attempts < maxAttempts) {
            const delay = attempts * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error("Error in message save retry:", error);
      return null;
    }
    
    return null;
  }
  
  /**
   * Track a pending user message
   */
  trackPendingUserMessage(messageId: string): void {
    this.userMessagesPending.add(messageId);
  }
  
  /**
   * Check if content is recent duplicate to avoid saving the same message multiple times
   */
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    // Check if we've saved the same message recently (debounce)
    const now = Date.now();
    if (now - this.lastMessageSentTime < this.minTimeBetweenMessages) {
      console.log(`Message received too quickly after previous one, might be duplicate`);
      return true;
    }
    
    this.lastMessageSentTime = now;
    return false;
  }
  
  /**
   * Get current active save count
   */
  getActiveMessageSaves(): number {
    return this.activeMessageSaves;
  }
  
  /**
   * Get pending user messages count
   */
  getPendingUserMessages(): number {
    return this.userMessagesPending.size;
  }
  
  /**
   * Report any pending user messages that never completed
   */
  reportPendingMessages(): void {
    if (this.userMessagesPending.size > 0) {
      console.warn(`WARNING: ${this.userMessagesPending.size} user messages may not have been saved properly`);
      toast.warning(`${this.userMessagesPending.size} user messages may not have been saved`, {
        duration: 3000,
      });
    }
  }
}
