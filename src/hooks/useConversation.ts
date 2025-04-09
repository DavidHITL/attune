
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

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
      }
    };
    
    getOrCreateConversation();
  }, [user]);

  // Helper function to validate and convert role
  const validateRole = (role: string): 'user' | 'assistant' => {
    if (role === 'user' || role === 'assistant') {
      return role;
    }
    console.warn(`Invalid role found in database: ${role}, defaulting to 'user'`);
    return 'user';
  };

  // Load messages for a conversation
  const loadMessages = async (convoId: string) => {
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
        
        // Log all messages for debugging
        validMessages.forEach((msg, index) => {
          console.log(`Message ${index + 1} - ${msg.role}: ${msg.content.substring(0, 30)}...`);
        });
      }
      
      setMessages(validMessages);
      return validMessages;
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  };

  // Save a new message to the database with improved error handling and verification
  const saveMessage = async (message: Message) => {
    if (!user || !conversationId) {
      console.error('Cannot save message: User not authenticated or conversation not initialized');
      return null;
    }
    
    // Don't save empty messages
    if (!message.content || message.content.trim() === '') {
      console.warn('Skipping empty message save attempt');
      return null;
    }
    
    try {
      console.log(`Saving message to conversation ${conversationId}: ${message.role} - ${message.content.substring(0, 30)}...`);
      
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
      
      if (error) {
        console.error('Error saving message:', error);
        throw error;
      }
      
      // Add the new message to the state with validated role
      const validatedMessage: Message = {
        id: data.id,
        role: validateRole(data.role),
        content: data.content,
        created_at: data.created_at
      };
      
      console.log(`Message saved successfully with ID: ${validatedMessage.id}`);
      
      // Verify message was saved correctly
      const { data: verifyData, error: verifyError } = await supabase
        .from('messages')
        .select('id, role, content')
        .eq('id', validatedMessage.id)
        .single();
        
      if (verifyError) {
        console.error('Error verifying message was saved:', verifyError);
      } else {
        console.log('Verified message in database:', verifyData);
        if (verifyData.content !== message.content) {
          console.warn('Message content verification mismatch!');
          console.warn('Original:', message.content.substring(0, 50));
          console.warn('Saved:', verifyData.content.substring(0, 50));
        }
      }
      
      setMessages(prev => [...prev, validatedMessage]);
      return validatedMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      
      // Try again after a brief delay
      try {
        console.log('Retrying save message after error...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data, error: retryError } = await supabase
          .from('messages')
          .insert([{
            conversation_id: conversationId,
            user_id: user.id,
            role: message.role,
            content: message.content
          }])
          .select('id, role, content, created_at')
          .single();
        
        if (retryError) {
          console.error('Error on retry saving message:', retryError);
          throw retryError;
        }
        
        const validatedMessage: Message = {
          id: data.id,
          role: validateRole(data.role),
          content: data.content,
          created_at: data.created_at
        };
        
        console.log(`Message saved successfully on retry with ID: ${validatedMessage.id}`);
        setMessages(prev => [...prev, validatedMessage]);
        return validatedMessage;
      } catch (retryError) {
        console.error('Failed to save message after retry:', retryError);
        
        // Add message to state even if DB save failed, so UI remains consistent
        const tempMessage: Message = {
          id: `temp-${new Date().getTime()}`,
          role: message.role,
          content: message.content,
          created_at: new Date().toISOString()
        };
        
        console.log('Adding temporary message to state despite save failure');
        setMessages(prev => [...prev, tempMessage]);
        
        // Show toast to user about potential sync issue
        toast({
          title: 'Warning',
          description: 'Message may not be saved. There could be sync issues with conversation history.',
          variant: 'destructive',
        });
        
        throw retryError;
      }
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
