
import React from 'react';
import { useEffect } from 'react';
import { useTerryRealInsights } from '@/hooks/useTerryRealInsights';
import { Button } from '@/components/ui/button';
import { RefreshCcw, AlertTriangle, BrainCircuit, Sparkles, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import InsightCard from './InsightCard';
import TriggersList from './TriggersList';
import SuggestionsList from './SuggestionsList';
import StrategiesChart from './StrategiesChart';

const GrowthInsights = () => {
  const { insights, loading, refreshInsights, formatStrategy } = useTerryRealInsights();
  
  // Function to format date nicely
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
    
    return formatter.format(date);
  };
  
  // Check if insights exist or are loaded
  const hasInsights = insights && 
    (insights.triggers?.length > 0 || 
     insights.suggestions?.length > 0 ||
     insights.losing_strategies?.primary);

  return (
    <div className="space-y-6">
      {loading ? (
        // Loading state
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : !hasInsights ? (
        // Empty state
        <InsightCard 
          title="Start Your Growth Journey"
          description="Chat with Attune to receive personalized insights"
        >
          <div className="text-center space-y-4 py-4">
            <BrainCircuit className="h-12 w-12 mx-auto text-primary/60 animate-pulse" />
            <p className="text-gray-300">
              As you interact with Attune, we'll analyze your communication patterns 
              and provide personalized insights based on Terry Real's relational framework.
            </p>
            <Button 
              onClick={refreshInsights} 
              className="mt-4 bg-attune-purple hover:bg-attune-purple/80 text-white"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Analyze My Conversations
            </Button>
          </div>
        </InsightCard>
      ) : (
        // Insights display
        <div className="space-y-6">
          {/* Triggers section */}
          <InsightCard 
            title="Your Triggers" 
            description="Situations that may activate your adaptive child mode"
            variant="triggers"
            icon={AlertTriangle}
          >
            <TriggersList triggers={insights?.triggers || []} className="py-2" />
          </InsightCard>

          {/* Primary Strategy section */}
          <InsightCard 
            title="Your Response Patterns" 
            description="Based on Terry Real's losing strategies framework"
            variant="strategies"
            icon={BrainCircuit}
          >
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="text-lg font-medium mr-2">Primary Response:</span>
                <span className="text-lg text-purple-300 font-medium">
                  {insights?.losing_strategies.primary && formatStrategy(insights.losing_strategies.primary)}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-2">
                When triggered, this is how you tend to respond most frequently. Understanding this pattern
                is the first step toward developing your wise adult response instead.
              </p>
              <StrategiesChart insights={insights} />
            </div>
          </InsightCard>

          {/* Suggestions section */}
          <InsightCard 
            title="Moving to Wise Adult Mode" 
            description="Suggested practices for your growth journey"
            variant="suggestions"
            icon={Sparkles}
          >
            <SuggestionsList suggestions={insights?.suggestions || []} className="py-2" />
          </InsightCard>
          
          {/* Last updated info */}
          {insights?.updated_at && (
            <div className="flex items-center justify-end text-xs text-gray-400 mt-2">
              <Calendar className="h-3 w-3 mr-1" />
              Last updated: {formatDate(insights.updated_at)}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshInsights} 
                className="ml-2 h-7 text-xs hover:bg-white/5"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GrowthInsights;
