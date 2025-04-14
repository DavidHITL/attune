
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.14.0';
import { corsHeaders } from './utils/cors.ts';
import { analyzeUserPatterns } from './handlers/patternAnalyzer.ts';
import { generateConversationSummaries } from './handlers/summaryGenerator.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialize Supabase client with service role key for admin access
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

    // Log the request details for debugging
    console.log(`Processing ${operation} request for user ${userId} ${conversationId ? `and conversation ${conversationId}` : ''}`);

    // Determine which operation to perform
    switch (operation) {
      case 'analyze_patterns':
        console.log(`Analyzing patterns for user ${userId}, conversation ${conversationId || 'all'}`);
        return await analyzeUserPatterns(userId, conversationId);
      case 'generate_summaries':
        console.log(`Generating summaries for user ${userId}, conversation ${conversationId || 'all'}`);
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
      JSON.stringify({ message: 'No user messages found for analysis' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
