
import React, { useEffect, useState } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

type ConversationSummary = {
  id: string;
  conversation_id: string;
  start_message_id: string;
  end_message_id: string;
  summary_content: string;
  key_points: string[];
  batch_number: number;
  created_at: string;
};

const SmartContext = () => {
  const { messages, conversationId } = useConversation();
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Count user messages only
  const userMessageCount = messages.filter(msg => msg.role === 'user').length;
  
  useEffect(() => {
    const loadSummaries = async () => {
      if (!conversationId || !user) return;
      
      // Only load summaries if we have more than 15 user messages
      if (userMessageCount < 15) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('conversation_summaries')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('batch_number', { ascending: true });
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          setSummaries(data as ConversationSummary[]);
        } else if (messages.length > 60) {
          // If we have many messages but no summaries, generate them
          await generateSummaries();
        }
      } catch (error) {
        console.error('Error loading summaries:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSummaries();
  }, [conversationId, user, messages.length, userMessageCount]);
  
  const generateSummaries = async () => {
    if (!conversationId || !user) return;
    
    try {
      toast.info('Analyzing your conversation...');
      
      const response = await supabase.functions.invoke('analyze-messages', {
        body: {
          userId: user.id,
          conversationId: conversationId,
          operation: 'generate_summaries'
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      toast.success('Conversation analysis complete');
      
      // Load the newly created summaries
      const { data, error } = await supabase
        .from('conversation_summaries')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('batch_number', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      if (data) {
        setSummaries(data as ConversationSummary[]);
      }
    } catch (error) {
      console.error('Error generating summaries:', error);
      toast.error('Failed to analyze conversation');
    }
  };
  
  if (loading) {
    return (
      <div className="p-4 bg-attune-purple/10 rounded-lg text-sm text-gray-300">
        <p>Loading conversation context...</p>
      </div>
    );
  }
  
  if (summaries.length === 0) {
    return null;
  }
  
  return (
    <div className="p-4 bg-attune-purple/10 rounded-lg mb-4">
      <h3 className="text-sm font-semibold mb-2">Your Conversation Summary</h3>
      
      {summaries.length > 0 && (
        <div className="space-y-3">
          {summaries.map((summary, index) => (
            <div key={summary.id} className="text-xs text-gray-300">
              <p className="mb-1">{summary.summary_content}</p>
              {index === summaries.length - 1 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-attune-purple">Key patterns in your communication</summary>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {summary.key_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartContext;
