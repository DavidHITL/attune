
export async function requestOpenAIToken(instructions: string, voice: string): Promise<any> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  console.log("[REALTIME-TOKEN] Preparing to send instructions to OpenAI");
  console.log("[REALTIME-TOKEN] Instructions length:", instructions.length);
  console.log("[REALTIME-TOKEN] Instructions first 100 chars:", instructions.substring(0, 100));
  console.log("[REALTIME-TOKEN] Instructions last 100 chars:", instructions.substring(instructions.length - 100));
  console.log("[REALTIME-TOKEN] Voice setting:", voice);
  
  // Ensure the Terry Real therapy approach is explicitly included
  const terryRealApproach = "Act as a couples coach using Terry Real's approach, blending direct advice and thought-provoking questions. Focus on core concepts like the harmony-disharmony-repair cycle, the adaptive child versus the wise adult, and the five losing strategies.";
  
  // Check if instructions already contain Terry Real approach
  const containsTerryReal = instructions.includes("Terry Real") && 
    instructions.includes("harmony-disharmony-repair");
    
  console.log(`[REALTIME-TOKEN] Instructions already contain Terry Real approach: ${containsTerryReal}`);
  
  // If Terry Real approach is not in the instructions, prepend it
  let finalInstructions = instructions;
  if (!containsTerryReal) {
    console.log("[REALTIME-TOKEN] Adding Terry Real approach to instructions");
    finalInstructions = terryRealApproach + "\n\n" + instructions;
    console.log("[REALTIME-TOKEN] New instructions length:", finalInstructions.length);
  }

  try {
    console.log("[REALTIME-TOKEN] Sending request to OpenAI API with final instructions");
    console.log("[REALTIME-TOKEN] Final instructions first 200 chars:", finalInstructions.substring(0, 200));
    console.log("[REALTIME-TOKEN] Final instructions last 200 chars:", finalInstructions.substring(finalInstructions.length - 200));
    
    // Check if final instructions contain key phrases from Terry Real approach
    const terryRealPhrases = [
      "Terry Real", "harmony-disharmony-repair", "adaptive child", "wise adult", "losing strategies"
    ];
    
    terryRealPhrases.forEach(phrase => {
      const containsPhrase = finalInstructions.includes(phrase);
      console.log(`[REALTIME-TOKEN] Final instructions contain "${phrase}": ${containsPhrase}`);
    });
    
    const requestBody = {
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: voice,
      instructions: finalInstructions
    };
    
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[REALTIME-TOKEN] OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const responseData = await response.json();
    console.log("[REALTIME-TOKEN] OpenAI session created successfully");
    console.log("[REALTIME-TOKEN] Response status:", response.status);
    console.log("[REALTIME-TOKEN] Response contains client_secret:", !!responseData?.client_secret);
    
    return responseData;
  } catch (error) {
    console.error("[REALTIME-TOKEN] Error in requestOpenAIToken:", error);
    throw error;
  }
}
