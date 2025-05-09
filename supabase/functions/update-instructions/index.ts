
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "./supabaseClient.ts";
import { corsHeaders } from "./config.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body with new instructions and voice
    const { instructions, voice } = await req.json();
    
    if (!instructions) {
      return new Response(JSON.stringify({ error: "No instructions provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log("Received update request with new instructions and voice:");
    console.log("Instructions excerpt:", instructions.substring(0, 100) + "...");
    console.log("Voice setting:", voice);
    
    // Validate voice parameter against supported voices
    const supportedVoices = ['alloy', 'echo', 'sage', 'ash', 'coral', 'shimmer', 'verse', 'ballad'];
    const defaultVoice = 'alloy';
    let safeVoice = voice && supportedVoices.includes(voice) ? voice : defaultVoice;
    
    if (voice && voice !== safeVoice) {
      console.log(`Provided voice "${voice}" is not supported. Using default voice "${defaultVoice}" instead.`);
    }
    
    // Update the most recent bot config with both instructions and voice
    const { data, error } = await supabase
      .from('bot_config')
      .update({ 
        instructions: instructions,
        voice: safeVoice,
        updated_at: new Date().toISOString()
      })
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("Error updating bot config:", error);
      throw error;
    }
    
    console.log("Bot config updated successfully");
    console.log("Voice set to:", safeVoice);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Bot configuration updated successfully",
      voice: safeVoice
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
