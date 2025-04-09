
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from '@/hooks/use-toast';

export type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
};

export const useConversation = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load or create conversation on component mount if user is authenticated
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const getOrCreateConversation = async () => {
      try {
        setLoading(true);
        
        // Call the RPC function to get or create a conversation
        const { data, error } = await supabase
          .rpc('get_or_create_conversation', { p_user_id: user.id });
        
        if (error) throw error;
        
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
      }
    };
    
    getOrCreateConversation();
  }, [user]);

  // Load messages for a conversation
  const loadMessages = async (convoId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Save a new message to the database
  const saveMessage = async (message: Message) => {
    if (!user || !conversationId) {
      console.error('Cannot save message: User not authenticated or conversation not initialized');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          user_id: user.id,
          role: message.role,
          content: message.content
        }])
        .select('id, role, content, created_at')
        .single();
      
      if (error) throw error;
      
      // Add the new message to the state
      setMessages(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  // Add message to UI state only (used for optimistic updates)
  const addLocalMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  return {
    conversationId,
    messages,
    loading,
    saveMessage,
    addLocalMessage,
    loadMessages
  };
};
