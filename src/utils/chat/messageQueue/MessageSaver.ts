
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
  private processedMessages: Set<string> = new Set();
  
  constructor(private saveMessageCallback: SaveMessageCallback) {}

  /**
   * Directly save a message with retry logic
   */
  async saveMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string): Promise<Message | null> {
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
    // Generate content fingerprint to avoid duplicates
    const contentFingerprint = `${role}:${content.substring(0, 50)}`;
    if (this.processedMessages.has(contentFingerprint)) {
      console.log(`Skipping duplicate ${role} message:`, content.substring(0, 50));
      return null;
    }
    
    this.activeMessageSaves++;
    
    // For user messages, try multiple times with increasing delays
    const maxRetries = role === 'user' ? 3 : 1;
    let attempt = 0;
    let saved = false;
    let savedMessage: Message | null = null;
    
    // Mark this message as being processed
    this.processedMessages.add(contentFingerprint);
    
    while (!saved && attempt < maxRetries) {
      attempt++;
      try {
        console.log(`Directly saving ${role} message (attempt ${attempt}): "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
        
        // For user messages, add to pending set and show toast
        if (role === 'user' && messageId) {
          this.userMessagesPending.add(messageId);
          
          toast.loading(`Saving user message...`, {
            id: messageId,
            duration: 5000
          });
        }
        
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
          toast.success("User message saved", {
            description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
            id: messageId,
            duration: 2000,
          });
        }
        
        break; // Exit retry loop on success
      } catch (error) {
        console.error(`Error directly saving ${role} message (attempt ${attempt}):`, error);
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // Increase delay with each retry
          console.log(`Will retry in ${delay}ms...`);
          
          // Update toast for user messages
          if (role === 'user' && messageId) {
            toast.loading(`Retrying save (${attempt}/${maxRetries})...`, {
              id: messageId,
              duration: delay + 2000
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          if (messageId && role === 'user') {
            // Keep track that we still have a pending message
            console.log(`User message ${messageId} failed to save directly after ${maxRetries} attempts`);
            
            // Show error toast for failed user message
            toast.error(`Failed to save user message after ${maxRetries} attempts`, {
              description: error instanceof Error ? error.message : "Database error",
              id: messageId,
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
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
    // Generate content fingerprint to avoid duplicates
    const contentFingerprint = `${role}:${content.substring(0, 50)}`;
    if (this.processedMessages.has(contentFingerprint)) {
      console.log(`Skipping duplicate ${role} message in retry:`, content.substring(0, 50));
      return null;
    }
    
    // Mark this message as being processed
    this.processedMessages.add(contentFingerprint);
    
    try {
      console.log(`Saving ${role} message with retry: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      
      // Try multiple attempts with increasing delays
      let attempts = 0;
      const maxAttempts = role === 'user' ? 3 : 1;
      const messageId = `${role}-retry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // For user messages, show toast
      if (role === 'user') {
        toast.loading(`Saving user message...`, {
          id: messageId,
          duration: 5000
        });
      }
      
      while (attempts < maxAttempts) {
        try {
          const savedMessage = await this.saveMessageCallback({
            role: role,
            content: content
          });
          
          console.log(`Successfully saved ${role} message to database (attempt ${attempts + 1})`, 
            savedMessage ? `with ID: ${savedMessage.id}` : "(no ID returned)");
          
          // Show success toast for user messages
          if (role === 'user') {
            toast.success("User message saved", {
              id: messageId,
              description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
              duration: 2000
            });
          }
          
          return savedMessage;
        } catch (error) {
          attempts++;
          console.error(`Error saving message (attempt ${attempts}):`, error);
          
          if (attempts < maxAttempts) {
            const delay = attempts * 1000;
            console.log(`Retrying in ${delay}ms...`);
            
            // Update toast for user messages
            if (role === 'user') {
              toast.loading(`Retrying save (${attempts}/${maxAttempts})...`, {
                id: messageId,
                duration: delay + 2000
              });
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Show error toast for user messages
            if (role === 'user') {
              toast.error(`Failed to save message after ${maxAttempts} attempts`, {
                id: messageId,
                description: error instanceof Error ? error.message : "Database error",
                duration: 3000
              });
            }
            
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
    
    // Check fingerprint
    const contentFingerprint = `${role}:${content.substring(0, 50)}`;
    return this.processedMessages.has(contentFingerprint);
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.processedMessages.clear();
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
