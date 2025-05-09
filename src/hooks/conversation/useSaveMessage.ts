
import { useState, useCallback } from "react";
import { Message } from "@/utils/types";
import { toast } from "sonner";
import { messageSaveService } from "@/utils/chat/messaging/MessageSaveService";
import { supabase } from "@/integrations/supabase/client";

export const useSaveMessage = (
  user: any,
  conversationId: string | null,
  validateRole: (role: string) => 'user' | 'assistant'
) => {
  const [saving, setSaving] = useState(false);

  /**
   * Uses central MessageSaveService to save messages to the database
   */
  const saveMessage = useCallback(
    async (message: Partial<Message>): Promise<Message | undefined> => {
      if (saving) {
        console.warn("Already saving a message, please wait");
        return;
      }

      if (!message.content) {
        console.error("Cannot save empty message");
        throw new Error("Cannot save empty message");
      }

      try {
        setSaving(true);

        // CRITICAL FIX: Get fresh user from auth state if not provided
        let currentUser = user;
        if (!currentUser) {
          const { data } = await supabase.auth.getUser();
          currentUser = data.user;
        }

        // Validate and normalize the role
        let validatedRole: 'user' | 'assistant';
        
        if (message.role !== 'user' && message.role !== 'assistant') {
          console.error(`Invalid role provided: ${message.role}. Converting to valid format.`);
          validatedRole = validateRole(message.role as string);
        } else {
          validatedRole = message.role;
        }

        console.log(`⚡ [useSaveMessage] Using MessageSaveService to save ${validatedRole} message`, {
          role: validatedRole,
          contentPreview: message.content.substring(0, 50),
          hasCurrentUser: !!currentUser,
          userId: currentUser?.id,
          timestamp: new Date().toISOString()
        });

        // Get or create a conversation ID if needed
        let targetConversationId = conversationId;
        if (!targetConversationId && currentUser) {
          console.log("No conversation ID provided, creating a new conversation");
          const { data: newConversationId, error: convError } = await supabase.rpc(
            "get_or_create_conversation",
            { p_user_id: currentUser.id }
          );

          if (convError) {
            console.error("Error creating conversation:", convError);
            throw convError;
          }

          console.log("Created conversation:", newConversationId);
          targetConversationId = newConversationId;
        }

        // Use the central service to save the message
        const savedMessage = await messageSaveService.saveMessageToDatabase({
          role: validatedRole,
          content: message.content,
          conversation_id: targetConversationId,
          user_id: currentUser?.id
        });

        return savedMessage as Message;
      } catch (error) {
        console.error("Error in saveMessage:", error);
        toast.error("Error saving message");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [user, conversationId, saving, validateRole]
  );

  return { saveMessage, saving };
};
