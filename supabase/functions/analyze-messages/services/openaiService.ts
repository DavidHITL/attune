
import { corsHeaders } from '../utils/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Function to analyze message content using OpenAI
export async function analyzeWithOpenAI(messageContent: string) {
  try {
    console.log('Calling OpenAI API for pattern analysis with enhanced context');
    console.log(`Content length: ${messageContent.length} characters`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert in Terry Real's Relational Life Therapy approach. Your task is to analyze communication patterns in the provided messages to identify relational dynamics and growth opportunities. Analyze both user messages and assistant responses to get full context of the conversation.

CORE CONCEPTS TO APPLY:

1. ADAPTIVE CHILD VS. WISE ADULT:
   - Adaptive Child: A reactive survival mode developed in childhood. Characteristics include:
     * Black and white thinking
     * Emotional reactivity
     * Focus on self-protection
     * Defensive communication
     * Need to be right
   - Wise Adult: A mature, responsive state. Characteristics include:
     * Balanced perspective
     * Emotional regulation
     * Focus on connection
     * Vulnerable communication
     * Ability to hold paradox and complexity

2. THE FIVE LOSING STRATEGIES:
   - Being Right: Prioritizing correctness over connection; intellectual dominance
   - Control: Attempting to change or manage others' feelings or behaviors
   - Unbridled Self-Expression: Emotional dumping without filters or consideration
   - Retaliation: Inflicting hurt in response to feeling hurt
   - Withdrawal: Emotionally or physically disengaging from difficult interactions

3. RELATIONAL CYCLES:
   - Harmony → Disharmony → Repair
   - Growth happens primarily in the repair phase
   - How users handle transitions between these states reveals patterns

4. CORE TRIGGERS:
   - Situations that activate the adaptive child
   - Often rooted in early developmental experiences
   - Create predictable reaction patterns

ANALYSIS REQUESTED:

Review the complete conversation history (including BOTH user and assistant messages) to identify:

1. TRIGGERS: Identify 3-5 specific situations or interaction patterns that appear to activate the user's adaptive child mode. Be specific and descriptive.

2. LOSING STRATEGIES: Score each of the five losing strategies on a scale of 0-10 based on evidence in the user's messages. Determine which appears to be the user's primary strategy and provide concrete examples.

3. WISE ADULT DEVELOPMENT: Identify 3-5 practical, specific suggestions for how the user could strengthen their wise adult presence in challenging moments. These should be actionable and tailored to their specific patterns.

Return your analysis in JSON format with these fields:
- triggers: Array of identified trigger patterns (specific situations that activate adaptive child)
- losingStrategies: Object with scores (0-10) for each strategy and the primary strategy identified with examples
- suggestions: Array of practical, specific steps to move toward wise adult responses`
          },
          {
            role: 'user',
            content: messageContent
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }
    
    // Parse the JSON response
    const analysisText = data.choices[0].message.content;
    const analysis = JSON.parse(analysisText);
    
    return {
      triggers: analysis.triggers || [],
      losingStrategies: analysis.losingStrategies || { 
        primary: "unknown",
        scores: {
          beingRight: 0,
          control: 0,
          unbridledExpression: 0,
          retaliation: 0,
          withdrawal: 0
        }
      },
      suggestions: analysis.suggestions || []
    };
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    return {
      triggers: ["Error analyzing messages"],
      losingStrategies: {
        primary: "unknown",
        scores: {
          beingRight: 0,
          control: 0,
          unbridledExpression: 0,
          retaliation: 0,
          withdrawal: 0
        }
      },
      suggestions: ["Error generating suggestions"]
    };
  }
}

// Function to summarize messages using OpenAI
export async function summarizeWithOpenAI(messageContent: string) {
  try {
    console.log('Calling OpenAI API for message summarization');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Summarize the following conversation between a user and an AI assistant.
            Focus primarily on what the USER said, with the assistant's responses providing context.
            Pay special attention to:
            1. Core themes and topics discussed by the USER
            2. Key insights or realizations shared by the USER
            3. Emotional patterns or tendencies shown by the USER
            
            Return your summary in JSON format with these fields:
            - content: A concise summary (100-200 words) focusing primarily on the USER's messages
            - keyPoints: Array of up to 5 key points from the user's side of the conversation`
          },
          {
            role: 'user',
            content: `Here is the conversation to summarize:\n\n${messageContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }
    
    // Parse the JSON response
    const summaryText = data.choices[0].message.content;
    const summary = JSON.parse(summaryText);
    
    return {
      content: summary.content || "Error generating summary",
      keyPoints: summary.keyPoints || []
    };
  } catch (error) {
    console.error('Error summarizing with OpenAI:', error);
    return {
      content: "Error generating summary",
      keyPoints: []
    };
  }
}
