
export class OpenAIRealtime {
  async exchangeSDP(token: string, offerSdp: string): Promise<RTCSessionDescriptionInit> {
    // Connect to OpenAI's Realtime API
    console.log("Sending offer to OpenAI...");
    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/sdp",
      },
      body: offerSdp,
    });
    
    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error(`OpenAI SDP exchange failed: ${errorText}`);
    }
    
    const answer = {
      type: "answer" as RTCSdpType,
      sdp: await sdpResponse.text(),
    };
    
    return answer;
  }
}
