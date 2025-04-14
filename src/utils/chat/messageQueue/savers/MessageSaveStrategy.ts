
import { Message, SaveMessageCallback } from '../../../types';
import { toast } from 'sonner';

/**
 * Handles different strategies for saving messages with retry logic
 */
export class MessageSaveStrategy {
  private processedMessages: Set<string> = new Set();
  
  constructor(private saveMessageCallback: SaveMessageCallback) {}
  
  /**
   * Save with direct strategy (for high priority messages)
   */
  async saveWithDirectStrategy(
    role: 'user' | 'assistant', 
    content: string,
    messageId?: string,
    maxRetries: number = 3
  ): Promise<Message | null> {
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
    
    // Mark this message as being processed
    this.processedMessages.add(contentFingerprint);
    
    // For user messages, try multiple times with increasing delays
    const retries = role === 'user' ? maxRetries : 1;
    let attempt = 0;
    let savedMessage: Message | null = null;
    
    while (attempt < retries) {
      attempt++;
      try {
        console.log(`Directly saving ${role} message (attempt ${attempt}): "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
        
        // For user messages, show toast
        if (role === 'user' && messageId) {
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
        
        // Show success toast for user message
        if (messageId && role === 'user') {
          toast.success("User message saved", {
            description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
            id: messageId,
            duration: 2000,
          });
        }
        
        return savedMessage;
      } catch (error) {
        console.error(`Error directly saving ${role} message (attempt ${attempt}):`, error);
        
        if (attempt < retries) {
          const delay = attempt * 1000; // Increase delay with each retry
          console.log(`Will retry in ${delay}ms...`);
          
          // Update toast for user messages
          if (role === 'user' && messageId) {
            toast.loading(`Retrying save (${attempt}/${retries})...`, {
              id: messageId,
              duration: delay + 2000
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          if (messageId && role === 'user') {
            // Show error toast for failed user message
            toast.error(`Failed to save user message after ${retries} attempts`, {
              description: error instanceof Error ? error.message : "Database error",
              id: messageId,
              duration: 3000,
            });
          }
          throw error;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Save with retry strategy (for lower priority messages)
   */
  async saveWithRetryStrategy(
    role: 'user' | 'assistant', 
    content: string
  ): Promise<Message | null> {
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
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.processedMessages.clear();
  }
}
