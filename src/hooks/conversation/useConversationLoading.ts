
import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';
import { toast } from 'sonner';

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
  conversationId: string | null,
  initializedRef: React.MutableRefObject<boolean>
) => {
  const loadingRef = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;
  
  useEffect(() => {
    // Skip if already loading, no user, we already have a conversation ID, or already initialized
    if (!user || loadingRef.current || conversationId || initializedRef.current) {
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
        
        if (!data) {
          throw new Error("No conversation ID returned from database");
        }
        
        console.log("Retrieved conversation ID:", data);
        setConversationId(data);
        
        // Fetch messages for this conversation
        await loadMessages(data);
        
        // Mark as initialized to prevent further initialization
        initializedRef.current = true;
        
        // Reset retry counter on success
        retryCount.current = 0;
        
        // Show success toast
        toast.success("Conversation loaded successfully");
      } catch (error) {
        console.error('Error getting conversation:', error);
        
        // Implement retry logic
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          const delay = Math.pow(2, retryCount.current) * 1000; // Exponential backoff
          
          toast.error(`Failed to load conversation. Retrying in ${delay/1000}s...`, {
            duration: delay + 1000
          });
          
          setTimeout(() => {
            loadingRef.current = false;
            getOrCreateConversation();
          }, delay);
        } else {
          toast.error("Failed to load conversation after multiple attempts", {
            description: "Please try refreshing the page",
            duration: 8000
          });
        }
      } finally {
        // Fix: Remove reference to undefined 'error' variable
        if (retryCount.current >= maxRetries) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    };
    
    getOrCreateConversation();
    
    // Cleanup function to ensure we don't have lingering state on unmount
    return () => {
      loadingRef.current = false;
    };
  }, [user, conversationId, setConversationId, loadMessages, setLoading, setMessages, validateRole, initializedRef]);
};
