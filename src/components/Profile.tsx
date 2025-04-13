
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type UserInsight = {
  id: string;
  user_id: string;
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

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [insights, setInsights] = useState<UserInsight | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load user insights when component mounts
  useEffect(() => {
    const loadInsights = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('user_insights')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
          
        if (error) {
          console.error('Error loading insights:', error);
          // If no insights found yet, we'll show default content
          if (error.code === 'PGRST116') {
            setLoading(false);
            return;
          }
          throw error;
        }
        
        setInsights(data as UserInsight);
      } catch (error) {
        toast({
          title: "Failed to load insights",
          description: "We couldn't load your personal insights. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadInsights();
  }, [user, toast]);
  
  // Request new analysis of user messages
  const requestAnalysis = async () => {
    if (!user) return;
    
    setLoading(true);
    toast({
      title: "Analyzing your conversations",
      description: "This may take a moment..."
    });
    
    try {
      const response = await supabase.functions.invoke('analyze-messages', {
        body: {
          userId: user.id,
          operation: 'analyze_patterns'
        }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast({
        title: "Analysis complete!",
        description: "Your insights have been updated."
      });
      
      // Reload insights
      const { data, error } = await supabase
        .from('user_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        throw error;
      }
      
      setInsights(data as UserInsight);
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logged out successfully"
    });
  };
  
  // Format the strategy name for display
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
  
  // Function to render insight sections
  const renderInsightSections = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      );
    }
    
    if (!insights) {
      return (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-3">Your Growth Journey</h3>
            <p className="text-gray-300">
              Chat with Attune to get personalized insights about your communication patterns
              and triggers based on Terry Real's relational framework.
            </p>
            <Button 
              onClick={requestAnalysis} 
              className="mt-4"
            >
              Analyze My Conversations
            </Button>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-attune-dark-purple border-attune-purple/50">
          <h3 className="text-xl font-semibold mb-3">Your Triggers</h3>
          <p className="mb-4">Situations that may activate your adaptive child mode:</p>
          <ul className="list-disc pl-5 space-y-1">
            {insights.triggers.slice(0, 3).map((trigger, i) => (
              <li key={i}>{trigger}</li>
            ))}
          </ul>
        </Card>
        
        <Card className="p-6 bg-attune-dark-purple border-attune-purple/50">
          <h3 className="text-xl font-semibold mb-3">Your Primary Response Strategy</h3>
          <div className="mb-4">
            <p className="font-semibold">{formatStrategy(insights.losing_strategies.primary)}</p>
            <p className="mt-2 text-gray-300">
              When triggered, you tend to use this strategy most frequently. Understanding this 
              pattern is the first step to developing your wise adult response instead.
            </p>
          </div>
        </Card>
        
        <Card className="p-6 bg-attune-dark-purple border-attune-purple/50">
          <h3 className="text-xl font-semibold mb-3">Moving to Wise Adult Mode</h3>
          <p className="mb-4">Suggested practices:</p>
          <ul className="list-disc pl-5 space-y-2">
            {insights.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </Card>
        
        <div className="text-right text-sm text-gray-400">
          Last updated: {new Date(insights.updated_at).toLocaleDateString()}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={requestAnalysis} 
            className="ml-2 text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex-1 flex flex-col items-center w-full max-w-4xl">
      <div className="w-full max-w-lg p-6">
        <h2 className="text-2xl font-sans font-semibold text-white mb-6">Growth Insights</h2>
        
        {user && (
          <div className="space-y-6 mb-8">
            {renderInsightSections()}
          </div>
        )}
        
        <Button 
          onClick={handleSignOut} 
          variant="outline" 
          className="w-full mt-8 text-black border-black hover:bg-white/10 font-sans"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;
