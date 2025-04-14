
import { toast } from 'sonner';

/**
 * Handles notifications for message save operations
 */
export class MessageNotifier {
  /**
   * Show saving notification
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
   * Show success notification
   */
  showSuccess(role: 'user' | 'assistant', content: string, messageId: string): void {
    if (role === 'user') {
      toast.success("Message saved", {
        id: messageId,
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 2000,
      });
    }
  }
  
  /**
   * Show error notification
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
