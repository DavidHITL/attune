
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserInsight = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  triggers: string[];
  losing_strategies: {
    primary: string;
    scores: {
      beingRight: number;
      control: number;
      unbridledExpression: number;
      retaliation: number;
      withdrawal: number;
    };
  };
  suggestions: string[];
  updated_at: string;
};

export const useTerryRealInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<UserInsight | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const loadInsights = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('user_insights')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          setInsights(data[0] as UserInsight);
        }
      } catch (error) {
        console.error('Error loading insights:', error);
        toast.error('Failed to load your insights');
      } finally {
        setLoading(false);
      }
    };
    
    loadInsights();
  }, [user]);
  
  const refreshInsights = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setLoading(true);
      toast.info('Analyzing your conversation history...');
      
      // Call the edge function to analyze the user's messages
      const response = await supabase.functions.invoke('analyze-messages', {
        body: {
          userId: user.id,
          operation: 'analyze_patterns'
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      // Fetch the updated insights
      const { data, error } = await supabase
        .from('user_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);
        
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setInsights(data[0] as UserInsight);
        toast.success('Your insights have been updated');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing insights:', error);
      toast.error('Failed to refresh your insights');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const formatStrategy = (strategy: string): string => {
    if (!strategy) return 'Unknown';
    
    switch (strategy) {
      case 'beingRight':
        return 'Being Right';
      case 'control':
        return 'Control';
      case 'unbridledExpression':
        return 'Unbridled Self-Expression';
      case 'retaliation':
        return 'Retaliation';
      case 'withdrawal':
        return 'Withdrawal';
      default:
        return strategy.charAt(0).toUpperCase() + strategy.slice(1);
    }
  };
  
  return {
    insights,
    loading,
    refreshInsights,
    formatStrategy
  };
};
