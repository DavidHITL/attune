
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook to trigger user message pattern analysis when voice chat sessions end
 */
export const useVoiceChatAnalysis = (isConnected: boolean) => {
  const { user } = useAuth();
  
  // Track the connection state to detect when sessions end
  useEffect(() => {
    // When connection state changes from connected to disconnected
    let analysisTimerRef: ReturnType<typeof setTimeout> | null = null;
    
    // Only run analysis when a voice chat session ends (was connected, now disconnected)
    const wasConnected = isConnected === false;
    
    const runAnalysisInBackground = async () => {
      if (!user) {
        console.log("Cannot run analysis - no authenticated user");
        return;
      }
      
      try {
        console.log("Running background voice chat analysis for user:", user.id);
        
        // First verify we have messages to analyze
        const { data: messagesCheck, error: checkError } = await supabase
          .from('messages')
          .select('id, role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (checkError) {
          console.error("Error checking for messages:", checkError);
          return;
        }
        
        if (!messagesCheck || messagesCheck.length === 0) {
          console.log("No messages found in database for user", user.id);
          return;
        }
        
        console.log(`Found ${messagesCheck.length} messages to analyze`);
        
        // Begin analysis in the background using the edge function
        const response = await supabase.functions.invoke('analyze-messages', {
          body: {
            userId: user.id,
            operation: 'analyze_patterns'
          }
        });
        
        if (response.error) {
          console.error("Error in background analysis:", response.error);
          return;
        }
        
        // Log detailed stats about the analysis
        if (response.data && response.data.stats) {
          console.log("Background voice chat analysis completed with stats:", response.data.stats);
          console.log(`Analyzed ${response.data.stats.userMessages} user messages and ${response.data.stats.assistantMessages} assistant messages`);
        } else {
          console.log("Background voice chat analysis completed", response.data);
        }
      } catch (error) {
        console.error("Error in background analysis:", error);
        // We don't show errors to the user since this is a background task
      }
    };
    
    if (wasConnected) {
      console.log("Voice chat session ended, scheduling analysis");
      // Small delay to ensure all messages are saved before analysis
      analysisTimerRef = setTimeout(() => {
        console.log("Running delayed analysis after session end");
        // Run without toast notifications since this is automatic
        runAnalysisInBackground();
      }, 3000);
    }
    
    // Clean up timer on unmount
    return () => {
      if (analysisTimerRef) {
        clearTimeout(analysisTimerRef);
      }
    };
  }, [isConnected, user]);
};
