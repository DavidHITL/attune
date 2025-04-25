
import { SaveMessageCallback } from '../../../types';
import { Message } from '../../../types';
import { toast } from 'sonner';

export class MessageSaveHandler {
  constructor(private saveMessageCallback: SaveMessageCallback) {}
  
  async saveMessageDirectly(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    try {
      return await this.saveMessageCallback({
        role,
        content
      });
    } catch (error) {
      console.error(`Direct save failed for ${role} message:`, error);
      throw error;
    }
  }

  showSaveNotification(role: 'user' | 'assistant', content: string) {
    if (role === 'user') {
      toast.success("Message saved", {
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 2000,
      });
    }
  }
}
