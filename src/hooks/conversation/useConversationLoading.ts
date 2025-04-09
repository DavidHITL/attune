
import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/utils/types';

/**
 * Hook for initializing and loading conversations
 */
export const useConversationLoading = (
  user: any,
  setConversationId: (id: string) => void,
  setMessages: (messages: Message[]) => void,
  setLoading: (loading: boolean) => void,
  validateRole: (role: string) => 'user' | 'assistant',
  loadMessages: (convoId: string) => Promise<Message[]>,
  conversationId: string | null
) => {
  const { toast } = useToast();
  const loadingRef = useRef(false);
  
  useEffect(() => {
    // Skip if already loading, no user, or we already have a conversation ID
    if (!user || loadingRef.current || conversationId) {
      setLoading(false);
      return;
    }
    
    const getOrCreateConversation = async () => {
      try {
        // Set loading state and reference to prevent concurrent calls
        setLoading(true);
        loadingRef.current = true;
        
        console.log("Fetching conversation for user:", user.id);
        
        // Call the RPC function to get or create a conversation
        const { data, error } = await supabase
          .rpc('get_or_create_conversation', { p_user_id: user.id });
        
        if (error) {
          console.error('Error getting conversation:', error);
          throw error;
        }
        
        console.log("Retrieved conversation ID:", data);
        setConversationId(data);
        
        // Fetch messages for this conversation
        await loadMessages(data);
      } catch (error) {
        console.error('Error getting conversation:', error);
        toast({
          title: 'Error',
          description: 'Failed to load conversation history',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };
    
    getOrCreateConversation();
    
    // Cleanup function to ensure we don't have lingering state on unmount
    return () => {
      loadingRef.current = false;
    };
  }, [user, conversationId, setConversationId, loadMessages, setLoading, setMessages, toast, validateRole]);
};
