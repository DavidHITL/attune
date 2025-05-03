
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/utils/types";
import { toast } from "sonner";

export const useSaveMessage = (
  user: any,
  conversationId: string | null,
  validateRole: (role: string) => 'user' | 'assistant'
) => {
  const [saving, setSaving] = useState(false);

  /**
   * CRITICAL FIX: Complete rewrite of saveMessage to properly handle roles
   * Saves a message to the database 
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

        // CRITICAL FIX #1: Validate and normalize the role
        // This enforces that role can ONLY be 'user' or 'assistant'
        let validatedRole: 'user' | 'assistant';
        
        if (message.role !== 'user' && message.role !== 'assistant') {
          console.error(`Invalid role provided: ${message.role}. Converting to valid format.`);
          // Use validateRole to prevent any role corruption
          validatedRole = validateRole(message.role as string);
        } else {
          validatedRole = message.role;
        }

        console.log(`⚡ [useSaveMessage] Saving ${validatedRole} message to database:`, {
          role: validatedRole,
          contentPreview: message.content.substring(0, 50),
          timestamp: new Date().toISOString()
        });

        // Get or create a conversation ID if needed
        let targetConversationId = conversationId;
        if (!targetConversationId) {
          console.log("No conversation ID provided, creating a new conversation");
          const { data: newConversation, error: convError } = await supabase.rpc(
            "get_or_create_conversation",
            { p_user_id: user.id }
          );

          if (convError) {
            console.error("Error creating conversation:", convError);
            throw convError;
          }

          console.log("Created conversation:", newConversation);
          targetConversationId = newConversation;
        }

        // CRITICAL FIX #2: Explicitly construct the message object with the validated role
        const messageToSave = {
          role: validatedRole, // THIS IS CRITICAL - use the validated role
          content: message.content,
          conversation_id: targetConversationId,
          user_id: user?.id,
        };

        // Log the exact message being sent to the database
        console.log('🔥 DATABASE INSERT - Saving message with role:', validatedRole, {
          content: message.content.substring(0, 50),
          conversation_id: targetConversationId,
          user_id: user?.id
        });

        // Insert the message into the database
        const { data: savedMessage, error } = await supabase
          .from("messages")
          .insert(messageToSave)
          .select("*")
          .single();

        if (error) {
          console.error("Error saving message:", error);
          throw error;
        }

        if (!savedMessage) {
          console.error("No message returned from insert operation");
          throw new Error("Failed to save message");
        }

        console.log(`✅ Successfully saved ${validatedRole} message:`, {
          id: savedMessage.id,
          role: savedMessage.role, // Log the role from the saved message
          created_at: savedMessage.created_at
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
