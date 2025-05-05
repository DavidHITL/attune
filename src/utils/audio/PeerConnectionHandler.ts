export class PeerConnectionHandler {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private messageQueue: string[] = []; // Queue to store messages before channel is open
  private isDataChannelOpen: boolean = false;
  
  constructor(private onMessage: (event: any) => void) {}
  
  async setupPeerConnection(): Promise<RTCPeerConnection> {
    console.log("Creating peer connection");
    
    // Create peer connection with appropriate configuration
    this.pc = new RTCPeerConnection({
      iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
    });
    
    // Set up data channel for events
    this.dc = this.pc.createDataChannel("events");
    
    // Properly handle data channel state changes
    this.dc.onopen = () => {
      console.log("Data channel is now open and ready to use");
      this.isDataChannelOpen = true;
      // Send any queued messages once channel is open
      this.flushMessageQueue();
    };
    
    this.dc.onclose = () => {
      console.log("Data channel closed");
      this.isDataChannelOpen = false;
    };
    
    this.dc.onerror = (error) => {
      console.error("Data channel error:", error);
    };
    
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
  
  // New method to safely send messages to the data channel
  sendMessage(message: any): void {
    if (!this.dc) {
      console.warn("Cannot send message - data channel not initialized");
      return;
    }
    
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    
    // Queue message if data channel is not open yet
    if (this.dc.readyState !== 'open') {
      console.log("Data channel not open yet, queuing message");
      this.messageQueue.push(messageString);
      return;
    }
    
    // Otherwise send immediately
    try {
      this.dc.send(messageString);
      console.log("Message sent through data channel");
    } catch (error) {
      console.error("Error sending message through data channel:", error);
      // Re-queue the message if there was an error sending it
      this.messageQueue.push(messageString);
    }
  }
  
  // Method to send all queued messages
  private flushMessageQueue(): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn("Cannot flush queue - data channel not open");
      return;
    }
    
    console.log(`Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.dc.send(message);
          console.log("Sent queued message");
        } catch (error) {
          console.error("Error sending queued message:", error);
          // If sending fails, put it back at the front of the queue and stop trying
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
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
  
  // Method to check if data channel is ready for sending
  isDataChannelReady(): boolean {
    return this.dc !== null && this.dc.readyState === 'open';
  }
  
  disconnect(): void {
    // Close data channel
    if (this.dc) {
      this.dc.close();
      this.dc = null;
      this.isDataChannelOpen = false;
    }
    
    // Close peer connection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    // Clear any queued messages
    this.messageQueue = [];
  }
}
