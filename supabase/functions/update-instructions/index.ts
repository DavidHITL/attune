
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
    
    console.log("[UPDATE-INSTRUCTIONS] Received update request for new instructions");
    console.log("[UPDATE-INSTRUCTIONS] Instructions length:", instructions.length);
    console.log("[UPDATE-INSTRUCTIONS] Instructions excerpt:", instructions.substring(0, 200) + "...");
    
    // First, check if the instructions already exist to avoid unnecessary updates
    const { data: existingConfig, error: checkError } = await supabase
      .from('bot_config')
      .select('instructions, id')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (checkError) {
      console.error("[UPDATE-INSTRUCTIONS] Error checking existing config:", checkError);
      throw checkError;
    }
    
    if (existingConfig && existingConfig.length > 0) {
      const currentInstructions = existingConfig[0].instructions;
      
      // Check if the instructions are already set to what we want
      if (currentInstructions.trim() === instructions.trim()) {
        console.log("[UPDATE-INSTRUCTIONS] Instructions are already up to date, no changes needed");
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Instructions already up to date, no changes made",
          id: existingConfig[0].id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log("[UPDATE-INSTRUCTIONS] Updating existing instructions");
      console.log("[UPDATE-INSTRUCTIONS] Current instructions length:", currentInstructions.length);
      console.log("[UPDATE-INSTRUCTIONS] Current instructions excerpt:", currentInstructions.substring(0, 200) + "...");
      
      // Update the most recent bot config
      const { data: updateData, error: updateError } = await supabase
        .from('bot_config')
        .update({ 
          instructions: instructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig[0].id)
        .select();
      
      if (updateError) {
        console.error("[UPDATE-INSTRUCTIONS] Error updating bot instructions:", updateError);
        throw updateError;
      }
      
      console.log("[UPDATE-INSTRUCTIONS] Instructions updated successfully for ID:", existingConfig[0].id);
      
      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('bot_config')
        .select('instructions')
        .eq('id', existingConfig[0].id)
        .single();
        
      if (verifyError) {
        console.error("[UPDATE-INSTRUCTIONS] Error verifying update:", verifyError);
      } else {
        console.log("[UPDATE-INSTRUCTIONS] Verified instructions length:", verifyData.instructions.length);
        console.log("[UPDATE-INSTRUCTIONS] Verified instructions match:", verifyData.instructions.length === instructions.length);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Instructions updated successfully",
        id: existingConfig[0].id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // If no existing config, create a new one
      console.log("[UPDATE-INSTRUCTIONS] No existing config found, creating new one");
      
      const { data: insertData, error: insertError } = await supabase
        .from('bot_config')
        .insert([{ 
          instructions: instructions,
          name: 'Default Bot',
          voice: 'alloy'
        }])
        .select();
      
      if (insertError) {
        console.error("[UPDATE-INSTRUCTIONS] Error inserting bot instructions:", insertError);
        throw insertError;
      }
      
      console.log("[UPDATE-INSTRUCTIONS] New instructions created successfully");
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "New instructions created successfully",
        id: insertData[0].id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error("[UPDATE-INSTRUCTIONS] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
