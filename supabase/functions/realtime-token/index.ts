
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./config.ts";
import { authenticateUser } from "./authService.ts";
import { getConversationHistory, getBotConfig } from "./conversationService.ts";
import { requestOpenAIToken } from "./openAIService.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let user = null;
    let requestBody = null;
    
    try {
      // Parse request body if present
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        requestBody = await req.json();
      }
    } catch (e) {
      // If JSON parsing fails, continue without body
      console.error("Failed to parse request body:", e);
    }
    
    // Get auth header and authenticate user - now with better error handling
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        user = await authenticateUser(authHeader);
        console.log("User authenticated:", user ? user.id : "failed");
      } catch (authError) {
        // Log the auth error but continue - we'll handle anonymous access
        console.error("Authentication error:", authError);
      }
    } else {
      console.log("No Authorization header present, proceeding as anonymous");
    }
    
    // Even if auth fails, we can still provide a limited experience
    let instructions = "";
    let recentMessages = [];
    
    // Get bot configuration - always needed
    const botConfig = await getBotConfig();
    
    console.log("Retrieved bot configuration:");
    console.log("Instructions (first 200 chars):", botConfig.instructions.substring(0, 200));
    console.log("Instructions length:", botConfig.instructions.length);
    console.log("Voice:", botConfig.voice);
    
    instructions = botConfig.instructions;
    
    // If authenticated, fetch conversation history
    if (user) {
      try {
        const result = await getConversationHistory(user.id);
        instructions = result.instructions; // This already includes the base instructions + history
        recentMessages = result.recentMessages;
        
        console.log("Using authenticated instructions with conversation history");
        console.log("Instructions start (first 200 chars):", instructions.substring(0, 200));
        console.log("Instructions length:", instructions.length);
        console.log("Has history:", recentMessages.length > 0);
      } catch (historyError) {
        console.error("Error processing conversation history:", historyError);
        // Continue with base instructions
      }
    } else {
      console.log("No authenticated user, skipping conversation history");
      instructions += "\n\nNote: The user is not authenticated, so this conversation will not be remembered.";
      console.log("Using non-authenticated instructions");
      console.log("Instructions start (first 200 chars):", instructions.substring(0, 200));
      console.log("Instructions length:", instructions.length);
    }

    // Request an ephemeral token from OpenAI
    const data = await requestOpenAIToken(instructions, botConfig.voice);
    console.log("Session created successfully");
    
    // Extract session_id and client_secret for SDP exchange
    const session_id = data.session_id;
    const apiKey = data.client_secret.value;
    
    console.log("[token] session", session_id);
    
    // Check if we have an SDP offer in the request
    const offer = requestBody?.offer;
    if (!offer) {
      console.error("Missing SDP offer in request");
      return new Response(JSON.stringify({ error: "Missing SDP offer" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Perform SDP exchange with OpenAI
    const OPENAI_BASE = "https://api.openai.com/v1";
    const sdpRes = await fetch(`${OPENAI_BASE}/realtime/sessions/${session_id}/sdp:exchange`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ offer })
    });
    
    // Check if SDP exchange failed
    if (!sdpRes.ok) {
      console.error("SDP exchange failed with status:", sdpRes.status);
      return new Response(JSON.stringify({ 
        error: 'sdp exchange failed', 
        status: sdpRes.status 
      }), { 
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Extract answer and ice_servers from response
    const sdpData = await sdpRes.json();
    const answer = JSON.stringify(sdpData.answer);
    const iceServers = sdpData.ice_servers;
    
    console.log("SDP exchange successful, returning answer and ice servers");
    
    // Return the expected response format
    return new Response(JSON.stringify({ answer, iceServers }), {
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
