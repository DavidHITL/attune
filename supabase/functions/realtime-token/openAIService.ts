
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
  
  // The specific Terry Real approach prompt that should be used
  const terryRealPrompt = "Act as a couples coach using Terry Real's approach, blending direct advice and thought-provoking questions. Focus on identifying core concepts like the harmony-disharmony-repair cycle, the adaptive child versus the wise adult, and the five losing strategies. Focus less on giving the user reassurance, and more on questioning their beliefs. Invite them subtly to reflect and gain new insights about themselves. Each session should last around 25 minutes: the first 10 minutes inviting the user to open up, with active listening and gentle nudges if needed. The next 10 minutes address core issues and any identified losing strategies, and the final 5 minutes wrap up positively. Use examples from Terry Real's book \"Us\".";
  
  // Check if instructions already contain the exact Terry Real prompt
  const containsTerryRealPrompt = instructions.includes(terryRealPrompt);
    
  console.log(`[REALTIME-TOKEN] Instructions already contain Terry Real prompt: ${containsTerryRealPrompt}`);
  
  // If Terry Real prompt is not in the instructions, prepend it
  let finalInstructions = instructions;
  if (!containsTerryRealPrompt) {
    console.log("[REALTIME-TOKEN] Adding Terry Real prompt to instructions");
    finalInstructions = terryRealPrompt + "\n\n" + instructions;
    console.log("[REALTIME-TOKEN] New instructions length:", finalInstructions.length);
  }

  try {
    console.log("[REALTIME-TOKEN] Sending request to OpenAI API with final instructions");
    console.log("[REALTIME-TOKEN] Final instructions first 200 chars:", finalInstructions.substring(0, 200));
    console.log("[REALTIME-TOKEN] Final instructions last 200 chars:", finalInstructions.substring(finalInstructions.length - 200));
    console.log("[REALTIME-TOKEN] Using voice:", voice);
    
    // Check if final instructions contain the Terry Real prompt
    console.log(`[REALTIME-TOKEN] Final instructions contain Terry Real prompt: ${finalInstructions.includes(terryRealPrompt)}`);
    
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
    console.log("[REALTIME-TOKEN] Voice used:", voice);
    
    return responseData;
  } catch (error) {
    console.error("[REALTIME-TOKEN] Error in requestOpenAIToken:", error);
    throw error;
  }
}
