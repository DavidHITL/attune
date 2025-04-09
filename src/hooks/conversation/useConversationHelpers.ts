
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';

/**
 * Helper functions for conversation operations
 */
export const useConversationHelpers = () => {
  /**
   * Validates and converts role to proper type
   */
  const validateRole = (role: string): 'user' | 'assistant' => {
    if (role === 'user' || role === 'assistant') {
      return role;
    }
    console.warn(`Invalid role found in database: ${role}, defaulting to 'user'`);
    return 'user';
  };

  /**
   * Loads messages for a given conversation ID
   */
  const loadMessages = async (convoId: string): Promise<Message[]> => {
    try {
      console.log(`Loading messages for conversation: ${convoId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading messages:', error);
        throw error;
      }
      
      // Convert database results to Message type with proper role validation
      const validMessages: Message[] = data ? data.map(item => ({
        id: item.id,
        role: validateRole(item.role),
        content: item.content,
        created_at: item.created_at
      })) : [];
      
      console.log(`Loaded ${validMessages.length} messages from database`);
      if (validMessages.length > 0) {
        console.log("First message:", validMessages[0].content.substring(0, 30) + "...");
        console.log("Last message:", validMessages[validMessages.length - 1].content.substring(0, 30) + "...");
        
        // Log message pairs to check conversation flow
        console.log("--- CONVERSATION FLOW CHECK ---");
        let userCount = 0;
        let assistantCount = 0;
        
        validMessages.forEach((msg, i) => {
          if (msg.role === 'user') userCount++;
          else assistantCount++;
          
          console.log(`[${i+1}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 30)}...`);
        });
        
        console.log(`Summary: ${userCount} user messages, ${assistantCount} assistant messages`);
        console.log("--- END FLOW CHECK ---");
      }
      
      return validMessages;
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  };

  return {
    validateRole,
    loadMessages
  };
};
