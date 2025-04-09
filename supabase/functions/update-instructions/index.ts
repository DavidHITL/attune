
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
    console.log("Instructions length:", instructions.length);
    console.log("Instructions excerpt:", instructions.substring(0, 200) + "...");
    
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
    
    // After updating, verify the update by fetching the latest bot config
    const { data: verifyConfig, error: verifyError } = await supabase
      .from('bot_config')
      .select('instructions')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (verifyError) {
      console.error("Error verifying updated instructions:", verifyError);
    } else {
      console.log("Instructions updated and verified successfully");
      console.log("Verified instructions length:", verifyConfig.instructions.length);
      console.log("Verified instructions excerpt:", verifyConfig.instructions.substring(0, 200) + "...");
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Instructions updated successfully",
      length: instructions.length,
      verified: verifyError ? false : true
    }), {
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
