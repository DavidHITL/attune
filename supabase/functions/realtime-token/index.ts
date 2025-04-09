
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
    // Get auth header and authenticate user
    const authHeader = req.headers.get('Authorization');
    const user = await authenticateUser(authHeader);
    
    let instructions = "";
    let recentMessages = [];
    
    // Get bot configuration - always needed
    const botConfig = await getBotConfig();
    instructions = botConfig.instructions;
    
    // If authenticated, fetch conversation history
    if (user) {
      try {
        const result = await getConversationHistory(user.id);
        instructions = result.instructions; // This already includes the base instructions + history
        recentMessages = result.recentMessages;
      } catch (historyError) {
        console.error("Error processing conversation history:", historyError);
        throw new Error(`History processing error: ${historyError.message}`);
      }
    } else {
      console.log("No authenticated user, skipping conversation history");
      instructions += "\n\nNote: The user is not authenticated, so this conversation will not be remembered.";
    }

    // Request an ephemeral token from OpenAI
    const data = await requestOpenAIToken(instructions, botConfig.voice);
    console.log("Session created successfully");
    
    // Return session token along with conversation context
    const result = {
      ...data,
      conversation_context: {
        has_history: recentMessages.length > 0,
        message_count: recentMessages.length
      }
    };
    
    return new Response(JSON.stringify(result), {
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
