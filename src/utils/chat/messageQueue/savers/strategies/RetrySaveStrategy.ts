
import { Message } from '@/utils/types';
import { SaveStrategy } from './SaveStrategy';
import { ContentValidator } from '../validators/ContentValidator';
import { RoleValidator } from '../validators/RoleValidator';
import { ContentProcessor } from '../processors/ContentProcessor';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

/**
 * Strategy for saving messages with retry capability
 */
export class RetrySaveStrategy implements SaveStrategy {
  private contentValidator = new ContentValidator();
  private roleValidator = new RoleValidator();
  private contentProcessor = new ContentProcessor();
  
  /**
   * Save a message with retry logic
   */
  async saveMessage(
    role: 'user' | 'assistant',
    content: string,
    options: {
      messageId?: string;
      maxRetries?: number;
      showNotification?: boolean;
    } = {}
  ): Promise<Message | null> {
    const { maxRetries = 3, showNotification = false } = options;
    
    // Validate role
    if (!this.roleValidator.isValidRole(role)) {
      console.error(`[RetrySaveStrategy] Invalid role: ${role}`);
      throw this.roleValidator.createInvalidRoleError(role);
    }
    
    // Validate content
    if (!this.contentValidator.isValidContent(content)) {
      console.log(`[RetrySaveStrategy] Skipping empty ${role} message`);
      return null;
    }
    
    // Check for duplicates
    if (this.contentProcessor.isDuplicate(role, content)) {
      console.log(`[RetrySaveStrategy] Skipping duplicate ${role} message: ${content.substring(0, 30)}...`);
      return null;
    }
    
    // Track this message
    this.contentProcessor.markAsProcessed(role, content);
    
    // Implement retry logic
    let attempt = 0;
    let lastError: Error | null = null;
    
    while (attempt < maxRetries) {
      attempt++;
      
      try {
        if (attempt > 1) {
          console.log(`[RetrySaveStrategy] Retry attempt ${attempt}/${maxRetries} for ${role} message`);
          
          // Show retry toast
          if (showNotification) {
            toast.loading(`Retrying save (${attempt}/${maxRetries})...`, {
              id: `retry-${role}-${Date.now()}`,
              duration: 2000,
            });
          }
        }
        
        // Use the central message save service
        const savedMessage = await messageSaveService.saveMessageToDatabase({
          role,
          content
        });
        
        // Show success toast
        if (showNotification && savedMessage) {
          toast.success(`${role === 'user' ? 'Message' : 'Response'} saved`, {
            duration: 2000,
          });
        }
        
        return savedMessage;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error during save');
        console.error(`[RetrySaveStrategy] Error on attempt ${attempt}/${maxRetries}:`, error);
        
        if (attempt >= maxRetries) {
          break;
        }
        
        // Wait before retrying
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[RetrySaveStrategy] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    if (showNotification) {
      toast.error(`Failed to save ${role === 'user' ? 'message' : 'response'} after ${maxRetries} attempts`, {
        description: lastError?.message || 'Unknown error',
        duration: 4000,
      });
    }
    
    if (lastError) {
      throw lastError;
    }
    
    return null;
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedTracking(): void {
    this.contentProcessor.reset();
  }
}
