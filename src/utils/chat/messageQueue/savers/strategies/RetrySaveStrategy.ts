
import { Message, SaveMessageCallback } from '../../../../types';
import { toast } from 'sonner';

/**
 * Strategy for saving messages with retry capability
 */
export class RetrySaveStrategy {
  constructor(private saveMessageCallback: SaveMessageCallback) {}
  
  /**
   * Save message with retry strategy
   */
  async saveMessage(
    role: 'user' | 'assistant', 
    content: string
  ): Promise<Message | null> {
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
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
}
