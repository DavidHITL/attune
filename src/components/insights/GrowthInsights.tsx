
import React from 'react';
import { useTerryRealInsights } from '@/hooks/useTerryRealInsights';
import { BrainCircuit, AlertTriangle, Sparkles, Calendar } from 'lucide-react';
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
        // Empty state with updated messaging
        <InsightCard 
          title="Processing your conversations"
          description="Your personalized insights are being generated"
        >
          <div className="text-center space-y-4 py-4">
            <div className="relative">
              <BrainCircuit className="h-14 w-14 mx-auto text-primary/60" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent rounded-full animate-pulse" />
            </div>
            <p className="text-gray-300">
              After each voice chat session, we analyze your communication patterns through 
              Terry Real's relational framework to help you understand your triggers and response strategies.
            </p>
            <div className="text-xs text-gray-400 italic mt-2">
              Insights will appear automatically after you've had enough conversations to identify patterns.
            </div>
            <button 
              onClick={refreshInsights}
              className="mt-4 px-4 py-2 bg-attune-purple/20 hover:bg-attune-purple/30 rounded-full text-sm text-attune-purple transition-colors"
            >
              Check for insights
            </button>
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
          <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
            <button 
              onClick={refreshInsights}
              className="px-3 py-1 bg-attune-purple/10 hover:bg-attune-purple/20 rounded-full text-attune-purple transition-colors"
            >
              Refresh insights
            </button>
            {insights?.updated_at && (
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Last updated: {formatDate(insights.updated_at)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthInsights;
