
export class PeerConnectionHandler {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  
  constructor(private onMessage: (event: any) => void) {}
  
  async setupPeerConnection(): Promise<RTCPeerConnection> {
    console.log("Creating peer connection");
    
    // Create peer connection with appropriate configuration
    this.pc = new RTCPeerConnection({
      iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
    });
    
    // Set up data channel for events
    this.dc = this.pc.createDataChannel("events");
    this.dc.onmessage = (event) => {
      try {
        const parsedEvent = JSON.parse(event.data);
        this.onMessage(parsedEvent);
      } catch (e) {
        console.error("Error parsing event data:", e);
      }
    };
    
    return this.pc;
  }
  
  async createLocalOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error("PeerConnection not initialized");
    }
    
    // Create and set local description
    console.log("Creating offer...");
    const offer = await this.pc.createOffer();
    
    console.log("Setting local description...");
    await this.pc.setLocalDescription(offer);
    
    // Debug info: Check if offer has audio media section
    if (!offer.sdp || !offer.sdp.includes('m=audio')) {
      console.error("WARNING: Generated offer does not contain audio media section!");
      console.log("SDP offer content:", offer.sdp);
    } else {
      console.log("Generated offer contains audio media section");
    }
    
    return offer;
  }
  
  async setRemoteDescription(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error("PeerConnection not initialized");
    }
    
    console.log("Setting remote description...");
    await this.pc.setRemoteDescription(answer);
    console.log("WebRTC connection established");
  }
  
  addAudioTrack(stream: MediaStream): void {
    if (!this.pc) {
      console.warn("Cannot add audio track - PeerConnection not initialized");
      return;
    }
    
    // Check if we already have audio tracks to avoid duplicates
    const senders = this.pc.getSenders();
    const hasSenders = senders.length > 0;
    console.log(`Current peer connection has ${senders.length} senders`);
    
    if (!hasSenders) {
      // Only add tracks if none exist
      stream.getAudioTracks().forEach(track => {
        this.pc!.addTrack(track, stream);
        console.log("Added audio track to peer connection:", track.label);
      });
    } else {
      console.log("Audio tracks already added, skipping");
    }
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
  }
}
