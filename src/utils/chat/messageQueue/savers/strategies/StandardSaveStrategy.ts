
import { Message } from '@/utils/types';
import { SaveStrategy } from './SaveStrategy';
import { ContentValidator } from '../validators/ContentValidator';
import { RoleValidator } from '../validators/RoleValidator';
import { MessageTracker } from '../trackers/MessageTracker';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';
import { ProcessedMessagesTracker } from '../utils/ProcessedMessagesTracker';

/**
 * Standard strategy for saving messages
 */
export class StandardSaveStrategy extends SaveStrategy {
  private contentValidator = new ContentValidator();
  private roleValidator = new RoleValidationHelper();
  private messageTracker = new MessageTracker();
  
  /**
   * Save a message with validation
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
    const { messageId, showNotification = false } = options;
    
    try {
      // Validate role
      if (!this.roleValidator.validateRole(role)) {
        console.error(`[StandardSaveStrategy] Invalid role: ${role}`);
        throw this.roleValidator.createInvalidRoleError(role);
      }
      
      // Validate content
      if (!this.contentValidator.isValidContent(content)) {
        console.log(`[StandardSaveStrategy] Skipping empty ${role} message`);
        return null;
      }
      
      // Check for duplicates
      if (this.contentProcessor.isDuplicate(role, content)) {
        console.log(`[StandardSaveStrategy] Skipping duplicate ${role} message: ${content.substring(0, 30)}...`);
        return null;
      }
      
      // Track this message
      this.contentProcessor.markAsProcessed(role, content);
      this.messageTracker.incrementActiveSaves();
      
      if (messageId) {
        this.messageTracker.trackMessage(messageId);
      }
      
      try {
        // Use the central message save service
        console.log(`[StandardSaveStrategy] Saving ${role} message: ${content.substring(0, 30)}...`);
        
        const savedMessage = await messageSaveService.saveMessageToDatabase({
          role,
          content
        });
        
        if (messageId) {
          this.messageTracker.untrackMessage(messageId);
        }
        
        if (showNotification && savedMessage) {
          toast.success(`${role === 'user' ? 'Message' : 'Response'} saved`, {
            duration: 2000,
          });
        }
        
        return savedMessage;
      } catch (error) {
        console.error(`[StandardSaveStrategy] Error saving ${role} message:`, error);
        
        if (showNotification) {
          toast.error(`Failed to save ${role === 'user' ? 'message' : 'response'}`, {
            description: error instanceof Error ? error.message : 'Unknown error',
            duration: 3000,
          });
        }
        
        throw error;
      }
    } catch (error) {
      console.error('[StandardSaveStrategy] Save error:', error);
      throw error;
    } finally {
      this.messageTracker.decrementActiveSaves();
    }
  }
  
  /**
   * Get pending message count
   */
  getPendingCount(): number {
    return this.messageTracker.getPendingCount();
  }
  
  /**
   * Get active saves count
   */
  getActiveSavesCount(): number {
    return this.messageTracker.getActiveSavesCount();
  }
  
  /**
   * Report any pending messages
   */
  reportPendingMessages(): void {
    this.messageTracker.reportPendingMessages();
  }
}

// Export a helper for role validation
class RoleValidationHelper {
  /**
   * Validate that the role is either 'user' or 'assistant'
   */
  validateRole(role: any): role is 'user' | 'assistant' {
    return role === 'user' || role === 'assistant';
  }
  
  /**
   * Create an error for invalid role
   */
  createInvalidRoleError(role: any): Error {
    return new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
  }
}
