
import { corsHeaders } from '../utils/cors.ts';
import { supabase } from '../index.ts';
import { summarizeWithOpenAI } from '../services/openaiService.ts';

// Function to generate conversation summaries for efficient context handling
export async function generateConversationSummaries(userId: string, conversationId?: string) {
  console.log(`Generating summaries for user ${userId}, conversation ${conversationId || 'all'}`);
  
  // Get conversations to summarize
  let conversationsQuery = supabase.from('conversations').select('id');
  
  if (userId) {
    conversationsQuery = conversationsQuery.eq('user_id', userId);
  }
  
  if (conversationId) {
    conversationsQuery = conversationsQuery.eq('id', conversationId);
  }
  
  const { data: conversations, error: convError } = await conversationsQuery;
  
  if (convError || !conversations || conversations.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No conversations found for summarization' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const summaryResults = [];
  
  // Process each conversation
  for (const conversation of conversations) {
    // Get messages for this conversation, ordered by creation time
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, content, role, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    
    if (msgError || !messages || messages.length === 0) {
      console.log(`No messages found for conversation ${conversation.id}`);
      continue;
    }
    
    // Check if we have enough messages to require summarization (more than 50)
    if (messages.length <= 50) {
      console.log(`Conversation ${conversation.id} has only ${messages.length} messages, no summarization needed`);
      continue;
    }
    
    // Create message batches of 50 for summarization
    const batches = [];
    for (let i = 0; i < messages.length; i += 50) {
      batches.push(messages.slice(i, i + 50));
    }
    
    console.log(`Created ${batches.length} batches for conversation ${conversation.id}`);
    
    // Generate summary for each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Separate user messages and assistant messages
      const userMessages = batch.filter(msg => msg.role === 'user');
      const assistantMessages = batch.filter(msg => msg.role === 'assistant');
      
      // Check if we have enough user messages to summarize
      if (userMessages.length < 5) {
        console.log(`Batch ${i} has only ${userMessages.length} user messages, skipping`);
        continue;
      }
      
      // Format conversation with focus on user messages but including assistant context
      let batchContent = '';
      let currentIndex = 0;
      
      // Build a conversation string that preserves context but emphasizes user messages
      while (currentIndex < batch.length) {
        const message = batch[currentIndex];
        
        if (message.role === 'user') {
          batchContent += `USER: ${message.content}\n\n`;
          
          // Include the next assistant message for context if it exists
          if (currentIndex + 1 < batch.length && batch[currentIndex + 1].role === 'assistant') {
            batchContent += `ASSISTANT (context): ${batch[currentIndex + 1].content.substring(0, 200)}${batch[currentIndex + 1].content.length > 200 ? '...' : ''}\n\n`;
            currentIndex += 2; // Skip the next message since we've included it
          } else {
            currentIndex += 1;
          }
        } else {
          // Just skip assistant messages that don't follow user messages
          currentIndex += 1;
        }
      }
      
      const startId = batch[0].id;
      const endId = batch[batch.length - 1].id;
      const startDate = batch[0].created_at;
      const endDate = batch[batch.length - 1].created_at;
      
      // Generate summary using OpenAI
      const summary = await summarizeWithOpenAI(batchContent);
      
      // Save the summary
      const { data: savedSummary, error: sumError } = await supabase
        .from('conversation_summaries')
        .upsert({
          conversation_id: conversation.id,
          start_message_id: startId,
          end_message_id: endId,
          start_date: startDate,
          end_date: endDate,
          summary_content: summary.content,
          key_points: summary.keyPoints,
          batch_number: i,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (sumError) {
        console.error(`Error saving summary for batch ${i}:`, sumError);
      } else {
        summaryResults.push(savedSummary);
      }
    }
  }
  
  return new Response(
    JSON.stringify({ 
      message: `Generated ${summaryResults.length} summaries successfully`, 
      summaries: summaryResults 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
