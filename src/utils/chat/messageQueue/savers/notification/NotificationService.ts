
import { toast } from 'sonner';

/**
 * Handles notifications for message operations
 */
export class NotificationService {
  /**
   * Show notification for saving in progress
   */
  showSaving(role: 'user' | 'assistant', messageId: string, attempt?: number): void {
    if (role === 'user') {
      const message = attempt 
        ? `Retrying save (${attempt}/3)...` 
        : 'Saving user message...';
      
      toast.loading(message, {
        id: messageId,
        duration: 5000
      });
    }
  }
  
  /**
   * Show notification for save success
   */
  showSuccess(role: 'user' | 'assistant', content: string, messageId: string): void {
    if (role === 'user') {
      toast.success("Message saved", {
        id: messageId,
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 2000,
      });
    } else if (role === 'assistant') {
      toast.success("Response saved", {
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 2000,
      });
    }
  }
  
  /**
   * Show notification for save error
   */
  showError(role: 'user' | 'assistant', error: Error, messageId: string, attempts?: number): void {
    if (role === 'user') {
      toast.error(`Failed to save message${attempts ? ` after ${attempts} attempts` : ''}`, {
        id: messageId,
        description: error.message || "Database error",
        duration: 3000,
      });
    }
  }
}
