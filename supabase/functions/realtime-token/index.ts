
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Get auth header and extract user ID
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError) {
          console.error("Auth error:", userError);
          throw new Error(`Authentication error: ${userError.message}`);
        }
        
        if (user) {
          userId = user.id;
          console.log("Authenticated user ID:", userId);
        }
      } catch (authError) {
        console.error("Error parsing auth header:", authError);
      }
    }

    // Get bot configuration
    const { data: botConfig, error: botConfigError } = await supabase
      .from('bot_config')
      .select('instructions, voice')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (botConfigError) {
      console.error("Error fetching bot config:", botConfigError);
      throw new Error(`Failed to fetch bot configuration: ${botConfigError.message}`);
    }

    let instructions = botConfig.instructions;
    let recentMessages = [];

    // If authenticated, fetch conversation history
    if (userId) {
      try {
        // Get or create a conversation for this user
        const { data: conversationResult, error: conversationError } = await supabase
          .rpc('get_or_create_conversation', {
            p_user_id: userId
          });
        
        if (conversationError) {
          console.error("Error getting/creating conversation:", conversationError);
        } else {
          const conversationId = conversationResult;
          console.log("Using conversation ID:", conversationId);
          
          // Fetch the most recent messages (limit to 10 for context window management)
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(10);
          
          if (messagesError) {
            console.error("Error fetching messages:", messagesError);
          } else if (messages && messages.length > 0) {
            recentMessages = messages;
            console.log(`Fetched ${messages.length} recent messages for context`);
            
            // Enhance instructions with conversation history
            const historyContext = messages
              .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
              .join('\n');
            
            instructions = `${instructions}\n\nRecent conversation history:\n${historyContext}`;
          }
        }
      } catch (historyError) {
        console.error("Error processing conversation history:", historyError);
      }
    }

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: botConfig.voice,
        instructions: instructions
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
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
