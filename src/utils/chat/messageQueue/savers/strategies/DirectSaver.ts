
import { Message, SaveMessageCallback } from '../../../../types';
import { SaveOptions, SaveResult } from '../core/SaverTypes';
import { MessageNotifier } from '../notifications/MessageNotifier';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

/**
 * Handles direct saving of messages with retry capability
 */
export class DirectSaver {
  private messageNotifier: MessageNotifier;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.messageNotifier = new MessageNotifier();
  }
  
  /**
   * Save message with direct approach and retry capability
   */
  async saveMessage(
    role: 'user' | 'assistant', 
    content: string, 
    options: SaveOptions = {}
  ): Promise<SaveResult> {
    const { trackId, maxRetries = 3, showNotification = true } = options;
    
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return { success: false, savedMessage: null };
    }
    
    // For user messages, try multiple times with increasing delays
    const retries = role === 'user' ? maxRetries : 1;
    let attempt = 0;
    let savedMessage: Message | null = null;
    
    while (attempt < retries) {
      attempt++;
      try {
        console.log(`Directly saving ${role} message (attempt ${attempt}): "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
        
        // Show saving notification if needed
        if (showNotification && trackId) {
          this.messageNotifier.showSaving(role, trackId, attempt > 1 ? attempt : undefined);
        }
        
        // Save to database using centralized service
        savedMessage = await messageSaveService.saveMessageToDatabase({
          role: role,
          content: content
        });
        
        console.log(`Successfully saved ${role} message to database`, 
          savedMessage ? `with ID: ${savedMessage.id}` : "(no ID returned)");
        
        // Show success toast if needed
        if (showNotification && trackId) {
          this.messageNotifier.showSuccess(role, content, trackId);
        }
        
        return { success: true, savedMessage };
      } catch (error) {
        console.error(`Error directly saving ${role} message (attempt ${attempt}):`, error);
        
        if (attempt < retries) {
          const delay = attempt * 1000; // Increase delay with each retry
          console.log(`Will retry in ${delay}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Show final error if needed
          if (showNotification && trackId) {
            this.messageNotifier.showError(
              role, 
              error instanceof Error ? error : new Error("Unknown error"), 
              trackId, 
              retries
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
  }
}
