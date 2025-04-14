
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.14.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Initialize Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Terry Real therapy concepts for context in our prompts
const terryRealConcepts = {
  adaptiveChild: "The 'Adaptive Child' is a survival mode developed in childhood to deal with difficult circumstances. It activates when triggered, leading to reactive behaviors rather than mature responses.",
  wiseAdult: "The 'Wise Adult' represents our capacity for mature, thoughtful response rather than reaction. It maintains connection while addressing issues directly.",
  losingStrategies: [
    "Being right: Focusing on proving correctness at the expense of connection",
    "Control: Attempting to manage others' behaviors or feelings",
    "Unbridled self-expression: Expressing emotions without filters or consideration",
    "Retaliation: Seeking to hurt others when feeling hurt",
    "Withdrawal: Disengaging emotionally or physically from conflict"
  ],
  harmonyDisharmonyRepair: "Relationships cycle through harmony, disharmony, and repair. Growth happens in the repair phase.",
  intimacySkills: [
    "Listening without defensiveness",
    "Speaking with vulnerability rather than criticism",
    "Self-regulation during difficult conversations",
    "Valuing the relationship over winning arguments"
  ]
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, conversationId, operation } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which operation to perform
    switch (operation) {
      case 'analyze_patterns':
        return await analyzeUserPatterns(userId, conversationId);
      case 'generate_summaries':
        return await generateConversationSummaries(userId, conversationId);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation specified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to analyze user message patterns according to Terry Real's framework
async function analyzeUserPatterns(userId: string, conversationId?: string) {
  console.log(`Analyzing patterns for user ${userId}, conversation ${conversationId || 'all'}`);
  
  // Get user messages for analysis
  let messagesQuery = supabase
    .from('messages')
    .select('content, created_at')
    .eq('user_id', userId)
    .eq('role', 'user')
    .order('created_at', { ascending: true });
  
  // Filter by conversation if specified
  if (conversationId) {
    messagesQuery = messagesQuery.eq('conversation_id', conversationId);
  }
  
  const { data: messages, error } = await messagesQuery;
  
  if (error) {
    console.error('Error fetching messages:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch messages' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  if (!messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No messages found for analysis' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log(`Found ${messages.length} messages for analysis`);
  
  // Prepare messages for analysis (limit to most recent 50 for API efficiency)
  const messagesToAnalyze = messages.slice(-50).map(msg => msg.content).join('\n\n');
  
  // Call OpenAI for pattern analysis
  const analysis = await analyzeWithOpenAI(messagesToAnalyze);
  
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

// Function to generate conversation summaries for efficient context handling
async function generateConversationSummaries(userId: string, conversationId?: string) {
  console.log(`Generating summaries for user ${userId}, conversation ${conversationId || 'all'}`);
  
  // Get conversations to summarize
  let conversationsQuery = supabase.from('conversations').select('id');
  
  if (userId) {
    conversationsQuery = conversationsQuery.eq('user_id', userId);
  }
  
  if (conversationId) {
    conversationsQuery = conversationsQuery.eq('id', conversationId);
  }
  
  const { data: conversations, error: convError } = await conversationsQuery;
  
  if (convError || !conversations || conversations.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No conversations found for summarization' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const summaryResults = [];
  
  // Process each conversation
  for (const conversation of conversations) {
    // Get messages for this conversation, ordered by creation time
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, content, role, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    
    if (msgError || !messages || messages.length === 0) {
      console.log(`No messages found for conversation ${conversation.id}`);
      continue;
    }
    
    // Check if we have enough messages to require summarization (more than 50)
    if (messages.length <= 50) {
      console.log(`Conversation ${conversation.id} has only ${messages.length} messages, no summarization needed`);
      continue;
    }
    
    // Create message batches of 50 for summarization
    const batches = [];
    for (let i = 0; i < messages.length; i += 50) {
      batches.push(messages.slice(i, i + 50));
    }
    
    console.log(`Created ${batches.length} batches for conversation ${conversation.id}`);
    
    // Generate summary for each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchContent = batch
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');
      
      const startId = batch[0].id;
      const endId = batch[batch.length - 1].id;
      const startDate = batch[0].created_at;
      const endDate = batch[batch.length - 1].created_at;
      
      // Generate summary using OpenAI
      const summary = await summarizeWithOpenAI(batchContent);
      
      // Save the summary
      const { data: savedSummary, error: sumError } = await supabase
        .from('conversation_summaries')
        .upsert({
          conversation_id: conversation.id,
          start_message_id: startId,
          end_message_id: endId,
          start_date: startDate,
          end_date: endDate,
          summary_content: summary.content,
          key_points: summary.keyPoints,
          batch_number: i,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (sumError) {
        console.error(`Error saving summary for batch ${i}:`, sumError);
      } else {
        summaryResults.push(savedSummary);
      }
    }
  }
  
  return new Response(
    JSON.stringify({ 
      message: `Generated ${summaryResults.length} summaries successfully`, 
      summaries: summaryResults 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Function to analyze message content using OpenAI
async function analyzeWithOpenAI(messageContent: string) {
  try {
    console.log('Calling OpenAI API for pattern analysis');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert in Terry Real's Relational Life Therapy approach. Your task is to analyze communication patterns in the provided messages to identify relational dynamics and growth opportunities.

CORE CONCEPTS TO APPLY:

1. ADAPTIVE CHILD VS. WISE ADULT:
   - Adaptive Child: A reactive survival mode developed in childhood. Characteristics include:
     * Black and white thinking
     * Emotional reactivity
     * Focus on self-protection
     * Defensive communication
     * Need to be right
   - Wise Adult: A mature, responsive state. Characteristics include:
     * Balanced perspective
     * Emotional regulation
     * Focus on connection
     * Vulnerable communication
     * Ability to hold paradox and complexity

2. THE FIVE LOSING STRATEGIES:
   - Being Right: Prioritizing correctness over connection; intellectual dominance
   - Control: Attempting to change or manage others' feelings or behaviors
   - Unbridled Self-Expression: Emotional dumping without filters or consideration
   - Retaliation: Inflicting hurt in response to feeling hurt
   - Withdrawal: Emotionally or physically disengaging from difficult interactions

3. RELATIONAL CYCLES:
   - Harmony → Disharmony → Repair
   - Growth happens primarily in the repair phase
   - How users handle transitions between these states reveals patterns

4. CORE TRIGGERS:
   - Situations that activate the adaptive child
   - Often rooted in early developmental experiences
   - Create predictable reaction patterns

ANALYSIS REQUESTED:

Carefully analyze the provided messages to identify:

1. TRIGGERS: Identify 3-5 specific situations or interaction patterns that appear to activate the user's adaptive child mode. Be specific and descriptive.

2. LOSING STRATEGIES: Score each of the five losing strategies on a scale of 0-10 based on evidence in the messages. Determine which appears to be the user's primary strategy and provide concrete examples.

3. WISE ADULT DEVELOPMENT: Identify 3-5 practical, specific suggestions for how the user could strengthen their wise adult presence in challenging moments. These should be actionable and tailored to their specific patterns.

Return your analysis in JSON format with these fields:
- triggers: Array of identified trigger patterns (specific situations that activate adaptive child)
- losingStrategies: Object with scores (0-10) for each strategy and the primary strategy identified with examples
- suggestions: Array of practical, specific steps to move toward wise adult responses`
          },
          {
            role: 'user',
            content: `Here are messages from the user:\n\n${messageContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }
    
    // Parse the JSON response
    const analysisText = data.choices[0].message.content;
    const analysis = JSON.parse(analysisText);
    
    return {
      triggers: analysis.triggers || [],
      losingStrategies: analysis.losingStrategies || { 
        primary: "unknown",
        scores: {
          beingRight: 0,
          control: 0,
          unbridledExpression: 0,
          retaliation: 0,
          withdrawal: 0
        }
      },
      suggestions: analysis.suggestions || []
    };
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    return {
      triggers: ["Error analyzing messages"],
      losingStrategies: {
        primary: "unknown",
        scores: {
          beingRight: 0,
          control: 0,
          unbridledExpression: 0,
          retaliation: 0,
          withdrawal: 0
        }
      },
      suggestions: ["Error generating suggestions"]
    };
  }
}

// Function to summarize messages using OpenAI
async function summarizeWithOpenAI(messageContent: string) {
  try {
    console.log('Calling OpenAI API for message summarization');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Summarize the following conversation between a user and an AI assistant. 
            Focus on:
            1. Core themes and topics discussed
            2. Key insights or realizations from the user
            3. Emotional patterns or tendencies shown by the user
            
            Return your summary in JSON format with these fields:
            - content: A concise summary (100-200 words)
            - keyPoints: Array of up to 5 key points from the conversation`
          },
          {
            role: 'user',
            content: `Here is the conversation to summarize:\n\n${messageContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }
    
    // Parse the JSON response
    const summaryText = data.choices[0].message.content;
    const summary = JSON.parse(summaryText);
    
    return {
      content: summary.content || "Error generating summary",
      keyPoints: summary.keyPoints || []
    };
  } catch (error) {
    console.error('Error summarizing with OpenAI:', error);
    return {
      content: "Error generating summary",
      keyPoints: []
    };
  }
}
