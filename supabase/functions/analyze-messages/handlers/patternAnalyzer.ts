
import { corsHeaders } from '../utils/cors.ts';
import { supabase } from '../index.ts';
import { analyzeWithOpenAI } from '../services/openaiService.ts';

// Function to analyze user message patterns according to Terry Real's framework
export async function analyzeUserPatterns(userId: string, conversationId?: string) {
  console.log(`Analyzing patterns for user ${userId}, conversation ${conversationId || 'all'}`);
  
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
  
  // Prepare user messages for analysis (limit to most recent 50 for API efficiency)
  const userMessagesToAnalyze = userMessages.slice(-50).map(msg => msg.content).join('\n\n');
  
  // Call OpenAI for pattern analysis
  const analysis = await analyzeWithOpenAI(userMessagesToAnalyze);
  
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
}
