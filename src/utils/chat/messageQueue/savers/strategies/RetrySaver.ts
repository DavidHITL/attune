
import { Message, SaveMessageCallback } from '../../../../types';
import { SaveOptions, SaveResult } from '../core/SaverTypes';
import { MessageNotifier } from '../notifications/MessageNotifier';

/**
 * Handles saving of messages with exponential backoff retry strategy
 */
export class RetrySaver {
  private messageNotifier: MessageNotifier;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.messageNotifier = new MessageNotifier();
  }
  
  /**
   * Save message with retry strategy
   */
  async saveMessage(
    role: 'user' | 'assistant', 
    content: string,
    options: SaveOptions = {}
  ): Promise<SaveResult> {
    const { showNotification = true } = options;
    
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return { success: false, savedMessage: null };
    }
    
    try {
      console.log(`Saving ${role} message with retry: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      
      // Try multiple attempts with increasing delays
      let attempts = 0;
      const maxAttempts = role === 'user' ? 3 : 1;
      const messageId = `${role}-retry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // For user messages, show toast
      if (showNotification && role === 'user') {
        this.messageNotifier.showSaving(role, messageId);
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
          if (showNotification && role === 'user') {
            this.messageNotifier.showSuccess(role, content, messageId);
          }
          
          return { success: true, savedMessage };
        } catch (error) {
          attempts++;
          console.error(`Error saving message (attempt ${attempts}):`, error);
          
          if (attempts < maxAttempts) {
            const delay = attempts * 1000;
            console.log(`Retrying in ${delay}ms...`);
            
            // Update toast for user messages
            if (showNotification && role === 'user') {
              this.messageNotifier.showSaving(role, messageId, attempts);
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Show error toast for user messages
            if (showNotification && role === 'user') {
              this.messageNotifier.showError(
                role, 
                error instanceof Error ? error : new Error("Unknown error"), 
                messageId, 
                maxAttempts
              );
            }
            
            return { 
              success: false, 
              savedMessage: null, 
              error: error instanceof Error ? error : new Error("Unknown error") 
            };
          }
        }
      }
      
      return { success: false, savedMessage: null };
    } catch (error) {
      console.error("Error in message save retry:", error);
      return { 
        success: false, 
        savedMessage: null, 
        error: error instanceof Error ? error : new Error("Unknown error")
      };
    }
  }
}
