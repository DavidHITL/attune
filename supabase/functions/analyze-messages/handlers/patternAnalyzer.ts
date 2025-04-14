
import { corsHeaders } from '../utils/cors.ts';
import { supabase } from '../index.ts';
import { analyzeWithOpenAI } from '../services/openaiService.ts';

// Function to analyze user message patterns according to Terry Real's framework
export async function analyzeUserPatterns(userId: string, conversationId?: string) {
  console.log(`Analyzing patterns for user ${userId}, conversation ${conversationId || 'all'}`);
  
  try {
    // Get conversation summaries for additional context
    let summariesQuery = supabase
      .from('conversation_summaries')
      .select('summary_content, key_points')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (conversationId) {
      summariesQuery = summariesQuery.eq('conversation_id', conversationId);
    }
    
    const { data: summaries, error: summariesError } = await summariesQuery;
    
    if (summariesError) {
      console.error('Error fetching conversation summaries:', summariesError);
    }
    
    // Get user messages for analysis - ONLY getting 'user' messages now
    let messagesQuery = supabase
      .from('messages')
      .select('content, created_at, role')
      .eq('user_id', userId)
      .eq('role', 'user')  // Only select user messages for primary analysis
      .order('created_at', { ascending: true });
    
    // Filter by conversation if specified
    if (conversationId) {
      messagesQuery = messagesQuery.eq('conversation_id', conversationId);
    }
    
    const { data: userMessages, error: userError } = await messagesQuery;
    
    if (userError) {
      console.error('Error fetching user messages:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userMessages || userMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No user messages found for analysis' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${userMessages.length} user messages for analysis`);
    
    // Prepare summary context if available
    let summaryContext = "";
    if (summaries && summaries.length > 0) {
      summaryContext = "PREVIOUS CONVERSATION SUMMARIES:\n\n";
      summaries.forEach((summary, index) => {
        summaryContext += `Summary ${index + 1}: ${summary.summary_content}\n\n`;
        if (summary.key_points && summary.key_points.length > 0) {
          summaryContext += "Key points:\n";
          summary.key_points.forEach((point: string) => {
            summaryContext += `- ${point}\n`;
          });
          summaryContext += "\n";
        }
      });
    }
    
    // Prepare user messages for analysis (increased to 200 for more comprehensive analysis)
    const userMessagesToAnalyze = userMessages.slice(-200).map(msg => msg.content).join('\n\n');
    
    // Combined context with summaries and messages
    const analysisContent = summaryContext + "\n\nRECENT USER MESSAGES:\n\n" + userMessagesToAnalyze;
    
    // Call OpenAI for pattern analysis with the enhanced context
    const analysis = await analyzeWithOpenAI(analysisContent);
    
    // Save analysis results
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('user_insights')
      .upsert({
        user_id: userId,
        conversation_id: conversationId || null,
        triggers: analysis.triggers,
        losing_strategies: analysis.losingStrategies,
        suggestions: analysis.suggestions,
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (saveError) {
      console.error('Error saving analysis:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'Analysis completed successfully', 
        analysis: savedAnalysis 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in pattern analysis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error during analysis' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
