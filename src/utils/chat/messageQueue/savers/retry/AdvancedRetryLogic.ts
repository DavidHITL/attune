
import { Message } from '../../../../types';
import { MessageSaveHandlerCore } from '../MessageSaveHandlerCore';
import { messageSaveService } from '../../../messaging/MessageSaveService';

/**
 * Implements advanced retry logic for message saving
 */
export class AdvancedRetryLogic {
  constructor(private core: MessageSaveHandlerCore) {}
  
  /**
   * Save message with comprehensive retry logic
   */
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // Validate role
    if (!this.core.roleValidation.validateRole(role)) {
      console.error(`[AdvancedRetryLogic] FATAL ERROR in saveMessageWithRetry: Invalid role "${role}". Must be 'user' or 'assistant'.`);
      throw this.core.roleValidation.createInvalidRoleError(role);
    }
    
    // Track message count by role
    const messageCount = this.core.tracking.incrementMessageCounter(role);
    
    // Implementation of retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    console.log(`[AdvancedRetryLogic] Starting retry save for ${role} message #${messageCount}`);
    
    const messageId = `retry-${role}-${Date.now()}`;
    
    try {
      return await this.core.retry.withRetry(
        // Operation to retry
        async () => {
          attempts++;
          console.log(`[AdvancedRetryLogic] Attempt ${attempts}/${maxAttempts} for ${role} message #${messageCount}`);
          
          // Create a clean object for each attempt
          const messageObj = {
            role: role,
            content: content
          };
          
          console.log(`[AdvancedRetryLogic] ⚠️ RETRY ${attempts} PRE-SAVE ROLE CHECK: role="${messageObj.role}"`);
          
          // Use the central message save service
          const result = await messageSaveService.saveMessageToDatabase(messageObj);
          
          if (result) {
            console.log(`[AdvancedRetryLogic] ✅ Successfully saved ${role} message #${messageCount} with ID: ${result.id} on attempt ${attempts}, FINAL ROLE: ${result.role}`);
            
            if (result.role !== role) {
              console.error(`[AdvancedRetryLogic] ❌ ROLE MISMATCH DETECTED! Expected="${role}", Actual="${result.role}"`);
            }
          }
          
          return result;
        },
        // Retry options
        {
          maxAttempts,
          retryDelay: (attempt) => attempt * 1000,
          onRetry: (attempt, error) => {
            console.log(`[AdvancedRetryLogic] Waiting ${attempt * 1000}ms before retry attempt ${attempt + 1}`);
            this.core.notifications.showSaving(role, messageId, attempt);
          }
        }
      );
    } catch (error) {
      console.error(`[AdvancedRetryLogic] ❌ All ${maxAttempts} attempts failed for ${role} message #${messageCount}`, error);
      throw error;
    }
  }
}
