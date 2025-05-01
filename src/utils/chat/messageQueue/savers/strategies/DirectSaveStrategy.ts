
import { Message, SaveMessageCallback } from '../../../../types';
import { toast } from 'sonner';

/**
 * Strategy for saving messages directly with high priority
 */
export class DirectSaveStrategy {
  constructor(private saveMessageCallback: SaveMessageCallback) {}
  
  /**
   * Save message with direct strategy and retry logic
   */
  async saveMessage(
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
}
