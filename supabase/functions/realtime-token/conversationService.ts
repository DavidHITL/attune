
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

export async function getBotConfig() {
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
  
  return botConfig;
}

export async function getConversationHistory(userId: string): Promise<{
  recentMessages: Message[];
  instructions: string;
}> {
  try {
    // Get or create a conversation for this user
    const { data: conversationResult, error: conversationError } = await supabase
      .rpc('get_or_create_conversation', {
        p_user_id: userId
      });
    
    if (conversationError) {
      console.error("Error getting/creating conversation:", conversationError);
      throw new Error(`Conversation error: ${conversationError.message}`);
    }
    
    const conversationId = conversationResult;
    console.log("Using conversation ID:", conversationId);
    
    // Fetch the messages - increased to 200 for better context
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      throw new Error(`Error fetching messages: ${messagesError.message}`);
    }
    
    // Get bot configuration for instructions
    const botConfig = await getBotConfig();
    let instructions = botConfig.instructions;
    let recentMessages: Message[] = [];
    
    if (messages && messages.length > 0) {
      // Reverse to get chronological order
      recentMessages = messages.reverse();
      console.log(`Fetched ${messages.length} recent messages for context`);
      
      // Enhanced instructions with conversation history
      const historyContext = recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      instructions = `${instructions}\n\nYou have conversed with this user before. Here is the recent conversation history to maintain continuity:\n\n${historyContext}\n\nContinue the conversation naturally, acknowledging previous context when relevant. The user is expecting you to remember this history.`;
      
      console.log("Added conversation history to instructions");
      console.log("History length:", historyContext.length, "characters");
      console.log("First message:", recentMessages[0]?.content?.substring(0, 30) || "None");
      console.log("Last message:", recentMessages[recentMessages.length - 1]?.content?.substring(0, 30) || "None");
      
      // Debug messages for each role
      const userMessages = recentMessages.filter(m => m.role === 'user').length;
      const assistantMessages = recentMessages.filter(m => m.role === 'assistant').length;
      console.log(`Message distribution: ${userMessages} user messages, ${assistantMessages} assistant messages`);
      
      // Log message pairs to verify conversation flow
      console.log("--- CONVERSATION SAMPLE (LATEST 5 TURNS) ---");
      const latestMessages = recentMessages.slice(-10);
      for (let i = 0; i < latestMessages.length; i += 2) {
        const userMsg = latestMessages[i]?.role === 'user' ? latestMessages[i] : latestMessages[i+1]?.role === 'user' ? latestMessages[i+1] : null;
        const aiMsg = latestMessages[i]?.role === 'assistant' ? latestMessages[i] : latestMessages[i+1]?.role === 'assistant' ? latestMessages[i+1] : null;
        
        if (userMsg) {
          console.log(`User [${new Date(userMsg.created_at).toISOString()}]: ${userMsg.content.substring(0, 50)}...`);
        }
        
        if (aiMsg) {
          console.log(`AI [${new Date(aiMsg.created_at).toISOString()}]: ${aiMsg.content.substring(0, 50)}...`);
        }
      }
      console.log("--- END CONVERSATION SAMPLE ---");
      
      // Verify database connectivity - additional debugging
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      
      if (countError) {
        console.error("Error verifying message count:", countError);
      } else {
        console.log(`Database verification: ${count} messages in conversation ${conversationId}`);
      }
    } else {
      console.log("No previous message history found");
      instructions += "\n\nThis is your first conversation with this user.";
    }
    
    return { recentMessages, instructions };
  } catch (error) {
    console.error("Error in getConversationHistory:", error);
    throw error;
  }
}
