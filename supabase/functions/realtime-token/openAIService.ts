
export async function requestOpenAIToken(instructions: string, voice: string): Promise<any> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  console.log("Sending instructions to OpenAI (first 200 chars):", instructions.substring(0, 200));
  console.log("Instructions length:", instructions.length);
  console.log("Voice setting:", voice);

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: voice,
        instructions: instructions
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const responseData = await response.json();
    console.log("OpenAI session created successfully");
    return responseData;
  } catch (error) {
    console.error("Error in requestOpenAIToken:", error);
    throw error;
  }
}
