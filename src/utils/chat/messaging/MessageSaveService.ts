
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/utils/types";
import { toast } from "sonner";

/**
 * Central service for saving messages to the database
 * This is the ONLY place where direct inserts to the messages table should occur
 */
export class MessageSaveService {
  private static instance: MessageSaveService;
  private activeInserts = 0;
  
  private constructor() {
    console.log("[MessageSaveService] Initialized central message saving service");
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MessageSaveService {
    if (!MessageSaveService.instance) {
      MessageSaveService.instance = new MessageSaveService();
    }
    return MessageSaveService.instance;
  }
  
  /**
   * Central function to save a message to the database
   * ALL message inserts should go through this function
   */
  public async saveMessageToDatabase(
    message: { role: 'user' | 'assistant'; content: string; conversation_id?: string; user_id?: string }
  ): Promise<Message | null> {
    try {
      // Validate role - critical for database integrity
      if (message.role !== 'user' && message.role !== 'assistant') {
        console.error(`[MessageSaveService] Invalid role: ${message.role}. Must be 'user' or 'assistant'.`);
        throw new Error(`Invalid role: ${message.role}. Must be 'user' or 'assistant'.`);
      }
      
      this.activeInserts++;
      
      // Log all message inserts for debugging
      console.log(`[MessageSaveService] Saving ${message.role} message to database:`, {
        role: message.role,
        contentPreview: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
        conversation_id: message.conversation_id,
        timestamp: new Date().toISOString(),
        activeInserts: this.activeInserts
      });
      
      // Create a clean message object to avoid reference issues
      const messageToSave = {
        role: message.role,
        content: message.content,
        conversation_id: message.conversation_id,
        user_id: message.user_id
      };
      
      // Perform the database insert
      const { data: savedMessage, error } = await supabase
        .from("messages")
        .insert(messageToSave)
        .select("*")
        .single();
      
      if (error) {
        console.error("[MessageSaveService] Error saving message:", error);
        throw error;
      }
      
      if (!savedMessage) {
        console.error("[MessageSaveService] No message returned from insert operation");
        throw new Error("Failed to save message");
      }
      
      // Verify role integrity
      if (savedMessage.role !== message.role) {
        console.error(`[MessageSaveService] ❌ ROLE MISMATCH: Expected=${message.role}, Actual=${savedMessage.role}`);
        toast.error(`Role mismatch error: ${message.role} → ${savedMessage.role}`, { 
          duration: 5000
        });
      } else {
        console.log(`[MessageSaveService] ✅ Successfully saved ${message.role} message with ID: ${savedMessage.id}`);
      }
      
      return savedMessage as Message;
    } catch (error) {
      console.error("[MessageSaveService] Error saving message:", error);
      throw error;
    } finally {
      this.activeInserts--;
    }
  }
}

// Export the singleton instance for easy importing
export const messageSaveService = MessageSaveService.getInstance();
