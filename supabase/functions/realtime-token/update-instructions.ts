
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "./supabaseClient.ts";
import { corsHeaders } from "./config.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body with new instructions
    const { instructions } = await req.json();
    
    if (!instructions) {
      return new Response(JSON.stringify({ error: "No instructions provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log("Received update request with new instructions:");
    console.log("Instructions excerpt:", instructions.substring(0, 100) + "...");
    
    // Update the most recent bot config
    const { data, error } = await supabase
      .from('bot_config')
      .update({ 
        instructions: instructions,
        updated_at: new Date().toISOString()
      })
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("Error updating bot instructions:", error);
      throw error;
    }
    
    console.log("Instructions updated successfully");
    
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
