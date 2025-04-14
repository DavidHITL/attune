
import { supabase } from './supabaseClient.ts';

export interface ConversationContext {
  has_history: boolean;
  message_count: number;
}

export interface Message {
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  conversation_id: string;
  summary_content: string;
  key_points: string[];
  batch_number: number;
  created_at: string;
}

export async function getBotConfig() {
  console.log("[REALTIME-TOKEN] Fetching bot configuration");
  
  const { data: botConfig, error: botConfigError } = await supabase
    .from('bot_config')
    .select('instructions, voice, id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (botConfigError) {
    console.error("[REALTIME-TOKEN] Error fetching bot config:", botConfigError);
    throw new Error(`Failed to fetch bot configuration: ${botConfigError.message}`);
  }
  
  console.log("[REALTIME-TOKEN] Bot config fetched successfully, id:", botConfig.id);
  console.log("[REALTIME-TOKEN] Instructions length:", botConfig.instructions.length);
  console.log("[REALTIME-TOKEN] Instructions first 200 chars:", botConfig.instructions.substring(0, 200));
  console.log("[REALTIME-TOKEN] Instructions last 200 chars:", botConfig.instructions.substring(botConfig.instructions.length - 200));
  console.log("[REALTIME-TOKEN] Voice setting:", botConfig.voice);
  
  // Check if instructions contain key phrases we expect
  const terryRealPhrases = [
    "Terry Real", "harmony-disharmony-repair", "adaptive child", "wise adult", "losing strategies"
  ];
  
  terryRealPhrases.forEach(phrase => {
    const containsPhrase = botConfig.instructions.includes(phrase);
    console.log(`[REALTIME-TOKEN] Instructions contain "${phrase}": ${containsPhrase}`);
  });
  
  return botConfig;
}

export async function getConversationHistory(userId: string): Promise<{
  recentMessages: Message[];
  instructions: string;
}> {
  try {
    console.log("[REALTIME-TOKEN] Getting conversation history for user:", userId);
    
    // Get or create a conversation for this user
    const { data: conversationResult, error: conversationError } = await supabase
      .rpc('get_or_create_conversation', {
        p_user_id: userId
      });
    
    if (conversationError) {
      console.error("[REALTIME-TOKEN] Error getting/creating conversation:", conversationError);
      throw new Error(`Conversation error: ${conversationError.message}`);
    }
    
    const conversationId = conversationResult;
    console.log("[REALTIME-TOKEN] Using conversation ID:", conversationId);
    
    // Fetch the most recent messages - limited to 200 for context window efficiency
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (messagesError) {
      console.error("[REALTIME-TOKEN] Error fetching messages:", messagesError);
      throw new Error(`Error fetching messages: ${messagesError.message}`);
    }
    
    // Get bot configuration for instructions
    const botConfig = await getBotConfig();
    let instructions = botConfig.instructions;
    let recentMessages: Message[] = [];
    let summaryContext = "";
    
    // Determine if we need to fetch summaries (if there are 200 messages, likely there are more)
    const needSummaries = messages && messages.length >= 200;
    
    if (needSummaries) {
      console.log("[REALTIME-TOKEN] Message limit reached (200), fetching conversation summaries for additional context");
      
      // Fetch available summaries for this conversation
      const { data: summaries, error: summariesError } = await supabase
        .from('conversation_summaries')
        .select('summary_content, key_points, batch_number')
        .eq('conversation_id', conversationId)
        .order('batch_number', { ascending: false })  // Get most recent summaries first
        .limit(3);  // Limit to 3 most recent summaries to avoid context window overflow
      
      if (summariesError) {
        console.error("[REALTIME-TOKEN] Error fetching summaries:", summariesError);
      } else if (summaries && summaries.length > 0) {
        console.log(`[REALTIME-TOKEN] Found ${summaries.length} conversation summaries`);
        
        // Format summaries for context
        summaryContext = "### Previous Conversation Context\n\n";
        summaries.forEach((summary, index) => {
          summaryContext += `Conversation Summary ${index + 1}:\n${summary.summary_content}\n\n`;
          
          // Include key points if available
          if (summary.key_points && summary.key_points.length) {
            summaryContext += "Key points:\n";
            summary.key_points.forEach((point, i) => {
              summaryContext += `- ${point}\n`;
            });
            summaryContext += "\n";
          }
        });
        
        console.log("[REALTIME-TOKEN] Added summary context length:", summaryContext.length);
      }
    }
    
    if (messages && messages.length > 0) {
      // Reverse to get chronological order
      recentMessages = messages.reverse();
      console.log(`[REALTIME-TOKEN] Fetched ${messages.length} recent messages for context`);
      
      // Enhanced instructions with conversation history
      const historyContext = recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      // Construct final instructions with both summaries and recent messages
      instructions = `${instructions}\n\nYou have conversed with this user before. ${summaryContext ? 'Here is a summary of your earlier conversations:' : ''}\n\n${summaryContext}${summaryContext ? '\n\n' : ''}Here is the recent conversation history to maintain continuity:\n\n${historyContext}\n\nContinue the conversation naturally, acknowledging previous context when relevant. The user is expecting you to remember this history.`;
      
      console.log("[REALTIME-TOKEN] Added conversation history to instructions");
      console.log("[REALTIME-TOKEN] Instructions base length:", botConfig.instructions.length);
      console.log("[REALTIME-TOKEN] Final instructions length (with history):", instructions.length);
      console.log("[REALTIME-TOKEN] First message:", recentMessages[0]?.content?.substring(0, 30) || "None");
      console.log("[REALTIME-TOKEN] Last message:", recentMessages[recentMessages.length - 1]?.content?.substring(0, 30) || "None");
      
      // Debug messages for each role
      const userMessages = recentMessages.filter(m => m.role === 'user').length;
      const assistantMessages = recentMessages.filter(m => m.role === 'assistant').length;
      console.log(`[REALTIME-TOKEN] Message distribution: ${userMessages} user messages, ${assistantMessages} assistant messages`);
      
      // Log message pairs to verify conversation flow
      console.log("[REALTIME-TOKEN] --- CONVERSATION SAMPLE (LATEST 5 TURNS) ---");
      const latestMessages = recentMessages.slice(-10);
      for (let i = 0; i < latestMessages.length; i += 2) {
        const userMsg = latestMessages[i]?.role === 'user' ? latestMessages[i] : latestMessages[i+1]?.role === 'user' ? latestMessages[i+1] : null;
        const aiMsg = latestMessages[i]?.role === 'assistant' ? latestMessages[i] : latestMessages[i+1]?.role === 'assistant' ? latestMessages[i+1] : null;
        
        if (userMsg) {
          console.log(`[REALTIME-TOKEN] User [${new Date(userMsg.created_at).toISOString()}]: ${userMsg.content.substring(0, 50)}...`);
        }
        
        if (aiMsg) {
          console.log(`[REALTIME-TOKEN] AI [${new Date(aiMsg.created_at).toISOString()}]: ${aiMsg.content.substring(0, 50)}...`);
        }
      }
      console.log("[REALTIME-TOKEN] --- END CONVERSATION SAMPLE ---");
      
      // If we included summaries, log that info
      if (summaryContext) {
        console.log("[REALTIME-TOKEN] --- INCLUDED SUMMARY CONTEXT ---");
        console.log(`Summary context length: ${summaryContext.length} characters`);
        console.log("[REALTIME-TOKEN] --- END SUMMARY CONTEXT ---");
      }
      
    } else {
      console.log("[REALTIME-TOKEN] No previous message history found");
      console.log("[REALTIME-TOKEN] Using base instructions (length):", instructions.length);
      instructions += "\n\nThis is your first conversation with this user.";
    }
    
    return { recentMessages, instructions };
  } catch (error) {
    console.error("[REALTIME-TOKEN] Error in getConversationHistory:", error);
    throw error;
  }
}
