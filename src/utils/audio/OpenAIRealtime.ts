
export class OpenAIRealtime {
  async exchangeSDP(token: string, offerSdp: string): Promise<RTCSessionDescriptionInit> {
    if (!token) {
      console.error("No authorization token provided for OpenAI API");
      throw new Error("Missing API token for OpenAI");
    }

    if (!offerSdp) {
      console.error("No SDP offer provided");
      throw new Error("Missing SDP offer");
    }

    try {
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
        let errorMessage = `OpenAI SDP exchange failed: ${sdpResponse.status} ${sdpResponse.statusText}`;
        
        try {
          const errorText = await sdpResponse.text();
          console.error("OpenAI API error:", errorText);
          errorMessage += ` - ${errorText}`;
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        
        throw new Error(errorMessage);
      }
      
      const sdpText = await sdpResponse.text();
      
      if (!sdpText || sdpText.trim() === '') {
        throw new Error("Received empty SDP answer from OpenAI");
      }
      
      const answer = {
        type: "answer" as RTCSdpType,
        sdp: sdpText,
      };
      
      return answer;
    } catch (error) {
      console.error("Error during OpenAI SDP exchange:", error);
      throw error;
    }
  }
}
