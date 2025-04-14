
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserInsight } from '@/utils/types';

// Extract formatStrategy as a standalone function
export const formatStrategy = (strategy: string): string => {
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
          const rawData = data[0];
          const convertedInsight: UserInsight = {
            id: rawData.id,
            user_id: rawData.user_id,
            conversation_id: rawData.conversation_id,
            triggers: Array.isArray(rawData.triggers) 
              ? rawData.triggers.map(t => String(t))
              : [],
            losing_strategies: {
              primary: typeof rawData.losing_strategies === 'object' 
                ? (rawData.losing_strategies as any).primary || 'unknown'
                : 'unknown',
              scores: typeof rawData.losing_strategies === 'object' 
                ? {
                    beingRight: Number((rawData.losing_strategies as any).scores?.beingRight || 0),
                    control: Number((rawData.losing_strategies as any).scores?.control || 0),
                    unbridledExpression: Number((rawData.losing_strategies as any).scores?.unbridledExpression || 0),
                    retaliation: Number((rawData.losing_strategies as any).scores?.retaliation || 0),
                    withdrawal: Number((rawData.losing_strategies as any).scores?.withdrawal || 0)
                  }
                : {
                    beingRight: 0,
                    control: 0,
                    unbridledExpression: 0,
                    retaliation: 0,
                    withdrawal: 0
                  }
            },
            suggestions: Array.isArray(rawData.suggestions) 
              ? rawData.suggestions.map(s => String(s))
              : [],
            updated_at: rawData.updated_at
          };
          
          setInsights(convertedInsight);
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
      
      const response = await supabase.functions.invoke('analyze-messages', {
        body: {
          userId: user.id,
          operation: 'analyze_patterns'
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
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
        const rawData = data[0];
        const convertedInsight: UserInsight = {
          id: rawData.id,
          user_id: rawData.user_id,
          conversation_id: rawData.conversation_id,
          triggers: Array.isArray(rawData.triggers) 
            ? rawData.triggers.map(t => String(t))
            : [],
          losing_strategies: {
            primary: typeof rawData.losing_strategies === 'object'
              ? (rawData.losing_strategies as any).primary || 'unknown'
              : 'unknown',
            scores: typeof rawData.losing_strategies === 'object'
              ? {
                  beingRight: Number((rawData.losing_strategies as any).scores?.beingRight || 0),
                  control: Number((rawData.losing_strategies as any).scores?.control || 0),
                  unbridledExpression: Number((rawData.losing_strategies as any).scores?.unbridledExpression || 0),
                  retaliation: Number((rawData.losing_strategies as any).scores?.retaliation || 0),
                  withdrawal: Number((rawData.losing_strategies as any).scores?.withdrawal || 0)
                }
              : {
                  beingRight: 0,
                  control: 0,
                  unbridledExpression: 0,
                  retaliation: 0,
                  withdrawal: 0
                }
          },
          suggestions: Array.isArray(rawData.suggestions) 
            ? rawData.suggestions.map(s => String(s))
            : [],
          updated_at: rawData.updated_at
        };
        
        setInsights(convertedInsight);
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
  
  
  
  return {
    insights,
    loading,
    refreshInsights,
    formatStrategy // Now explicitly returned
  };
};
