
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "./supabaseClient.ts";
import { corsHeaders } from "./config.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const newInstructions = `Act as a couples coach using Terry Real's approach, blending direct advice and thought-provoking questions. Focus on core concepts like the harmony-disharmony-repair cycle, the adaptive child versus the wise adult, and the five losing strategies. Each session should last around 25 minutes: the first 10 minutes inviting the user to open up, with active listening and gentle nudges if needed. The next 10 minutes address core issues and any identified losing strategies, and the final 5 minutes wrap up positively. Use examples from Terry Real's work without direct references, and always maintain a psychologically useful manner.`;
    
    // Update the most recent bot config
    const { data, error } = await supabase
      .from('bot_config')
      .update({ 
        instructions: newInstructions,
        updated_at: new Date().toISOString()
      })
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("Error updating bot instructions:", error);
      throw error;
    }
    
    return new Response(JSON.stringify({ success: true, message: "Instructions updated successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
