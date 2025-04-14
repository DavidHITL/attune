import { corsHeaders } from '../utils/cors.ts';
import { supabase } from '../index.ts';
import { analyzeWithOpenAI } from '../services/openaiService.ts';

// Function to analyze user message patterns according to Terry Real's framework
export async function analyzeUserPatterns(userId: string, conversationId?: string) {
  console.log(`Starting pattern analysis for user ${userId}, conversation ${conversationId || 'all'}`);
  
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
    
    // CRITICAL FIX: Get all messages first to debug what's in the database
    console.log(`Fetching messages for user ${userId}, this is a critical debugging step`);
    let allMessagesQuery = supabase
      .from('messages')
      .select('content, created_at, role')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
      
    const { data: debugMessages, error: debugError } = await allMessagesQuery;
    
    if (debugError) {
      console.error('Debug error fetching all messages:', debugError);
    } else {
      console.log(`Found ${debugMessages?.length || 0} total messages in database`);
      if (debugMessages && debugMessages.length > 0) {
        const userMsgs = debugMessages.filter(m => m.role === 'user');
        const assistantMsgs = debugMessages.filter(m => m.role === 'assistant');
        console.log(`Found ${userMsgs.length} user messages and ${assistantMsgs.length} assistant messages`);
        
        if (userMsgs.length > 0) {
          console.log('Sample user message:', userMsgs[0].content.substring(0, 100));
        } else {
          console.error('⚠️ NO USER MESSAGES FOUND - THIS IS THE CRITICAL ISSUE');
        }
      }
    }
    
    // Now get user messages for analysis - SPECIFICALLY filter for role='user' messages
    let messagesQuery = supabase
      .from('messages')
      .select('content, created_at, role')
      .eq('user_id', userId)
      .eq('role', 'user') // Explicitly filter for user messages
      .order('created_at', { ascending: true });
    
    // Filter by conversation if specified
    if (conversationId) {
      messagesQuery = messagesQuery.eq('conversation_id', conversationId);
    }
    
    const { data: userMessages, error: messagesError } = await messagesQuery;
    
    if (messagesError) {
      console.error('Error fetching user messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Retrieved ${userMessages?.length || 0} user messages for analysis`);
    
    if (!userMessages || userMessages.length === 0) {
      console.log('No user messages found for analysis, cannot proceed');
      return new Response(
        JSON.stringify({ message: 'No user messages found for analysis' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also get assistant messages for context
    let assistantMessagesQuery = supabase
      .from('messages')
      .select('content, created_at, role')
      .eq('user_id', userId)
      .eq('role', 'assistant') // Explicitly filter for assistant messages
      .order('created_at', { ascending: true });
      
    if (conversationId) {
      assistantMessagesQuery = assistantMessagesQuery.eq('conversation_id', conversationId);
    }
    
    const { data: assistantMessages, error: assistantError } = await assistantMessagesQuery;
    
    if (assistantError) {
      console.error('Error fetching assistant messages:', assistantError);
    }
    
    // Combine user and assistant messages and sort by creation time
    const allMessages = [...(userMessages || []), ...(assistantMessages || [])].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    
    console.log(`Combined ${userMessages.length} user messages and ${assistantMessages?.length || 0} assistant messages for analysis`);
    
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
    
    // Prepare conversation history with both user and assistant messages interleaved
    let conversationHistory = "";
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      conversationHistory += `${role}: ${msg.content}\n\n`;
    }
    
    // Limit conversation history to last 200 exchanges if it's very long
    const messageLimit = 200;
    if (allMessages.length > messageLimit) {
      console.log(`Conversation too long (${allMessages.length} messages), limiting to last ${messageLimit}`);
      
      // Re-create conversation history with limited messages
      conversationHistory = "";
      const limitedMessages = allMessages.slice(-messageLimit);
      for (let i = 0; i < limitedMessages.length; i++) {
        const msg = limitedMessages[i];
        const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
        conversationHistory += `${role}: ${msg.content}\n\n`;
      }
    }
    
    // Combined context with summaries and conversation history
    const analysisContent = summaryContext + "\n\nCONVERSATION HISTORY:\n\n" + conversationHistory;
    
    // Add logging for conversation content
    console.log(`Prepared analysis content with ${analysisContent.length} characters`);
    console.log(`First 200 chars of analysis content: ${analysisContent.substring(0, 200)}`);
    
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
        analysis: savedAnalysis,
        stats: {
          userMessages: userMessages.length,
          assistantMessages: assistantMessages?.length || 0,
          totalMessages: allMessages.length,
        }
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
