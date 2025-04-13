
// This edge function will be scheduled to run periodically to analyze user messages
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.14.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialize Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled analysis run');
    
    // Find users with recent message activity (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const { data: activeUsers, error: userError } = await supabase
      .from('messages')
      .select('user_id, created_at')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });
    
    if (userError) {
      throw new Error(`Error fetching active users: ${userError.message}`);
    }
    
    // Get unique user IDs
    const uniqueUserIds = [...new Set(activeUsers?.map(u => u.user_id))];
    console.log(`Found ${uniqueUserIds.length} users with recent activity`);
    
    // Process each user
    const results = [];
    for (const userId of uniqueUserIds) {
      try {
        // Call the analysis endpoint for this user
        const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            operation: 'analyze_patterns'
          })
        });
        
        const analysisResult = await analysisResponse.json();
        results.push({ userId, status: 'success', result: analysisResult });
        
        // Also generate conversation summaries if needed
        const summaryResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            operation: 'generate_summaries'
          })
        });
        
        const summaryResult = await summaryResponse.json();
        results.push({ userId, status: 'summary_success', result: summaryResult });
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
        results.push({ userId, status: 'error', error: userError.message });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        message: `Processed ${uniqueUserIds.length} users`,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scheduled analysis:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
