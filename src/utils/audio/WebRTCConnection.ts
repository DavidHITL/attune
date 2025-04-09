
import { supabase } from "@/integrations/supabase/client";

export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement;
  private hasReceivedSessionCreated: boolean = false;
  
  constructor() {
    this.audioElement = new Audio();
    this.audioElement.autoplay = true;
  }
  
  async init(onMessage: (event: any) => void): Promise<void> {
    try {
      console.log("Initializing WebRTC connection");
      
      // Get auth token to pass to the edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Failed to get auth session:", sessionError);
      }
      
      // Get token from edge function
      const accessToken = session?.access_token || null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Only add Authorization header if we have a token
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        console.log("Using authentication token for edge function");
      } else {
        console.log("No authentication token available");
      }
      
      const response = await supabase.functions.invoke('realtime-token', {
        headers: headers
      });
      
      if (response.error) {
        throw new Error(`Failed to get session token: ${response.error.message || 'Unknown error'}`);
      }
      
      const data = await response.data;
      
      if (!data || !data.client_secret?.value) {
        throw new Error("Invalid session token response");
      }
      
      // Log conversation context for debugging
      if (data.conversation_context) {
        console.log(
          "Conversation context:", 
          data.conversation_context.has_history ? 
            `Loaded ${data.conversation_context.message_count} previous messages` : 
            "No previous conversation history"
        );
      }
      
      this.hasReceivedSessionCreated = false;
      
      // Create peer connection
      this.pc = new RTCPeerConnection();
      
      // Set up data channel for events
      this.dc = this.pc.createDataChannel("events");
      this.dc.onmessage = (event) => {
        try {
          const parsedEvent = JSON.parse(event.data);
          onMessage(parsedEvent);
        } catch (e) {
          console.error("Error parsing event data:", e);
        }
      };
      
      // Set up remote audio
      this.pc.ontrack = (event) => {
        console.log("Track received:", event);
        this.audioElement.srcObject = event.streams[0];
      };
      
      return await this.completeConnection(data.client_secret.value);
      
    } catch (error) {
      console.error("WebRTC connection error:", error);
      throw error;
    }
  }
  
  private async completeConnection(token: string): Promise<void> {
    if (!this.pc) {
      throw new Error("PeerConnection not initialized");
    }
    
    // Create and set local description
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    
    // Connect to OpenAI's Realtime API
    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    });
    
    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error(`OpenAI SDP exchange failed: ${errorText}`);
    }
    
    const answer = {
      type: "answer" as RTCSdpType,
      sdp: await sdpResponse.text(),
    };
    
    await this.pc.setRemoteDescription(answer);
    console.log("WebRTC connection established");
  }
  
  addAudioTrack(microphone: MediaStream): void {
    if (!this.pc) return;
    
    // Add audio track to the peer connection
    microphone.getAudioTracks().forEach(track => {
      this.pc!.addTrack(track, microphone);
      console.log("Added audio track to peer connection:", track.label);
    });
  }
  
  setMuted(muted: boolean): void {
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
  }
  
  isSessionCreated(): boolean {
    return this.hasReceivedSessionCreated;
  }
  
  setSessionCreated(created: boolean): void {
    this.hasReceivedSessionCreated = created;
  }
  
  disconnect(): void {
    // Close data channel
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    
    // Close peer connection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    // Reset audio element
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
    
    console.log("WebRTC connection closed");
  }
}
