
import { SessionManager } from './SessionManager';
import { AudioHandler } from './AudioHandler';
import { PeerConnectionHandler } from './PeerConnectionHandler';
import { OpenAIRealtime } from './OpenAIRealtime';

export class WebRTCConnection {
  private sessionManager: SessionManager;
  private audioHandler: AudioHandler;
  private peerConnectionHandler: PeerConnectionHandler;
  private openAIRealtime: OpenAIRealtime;
  private hasReceivedSessionCreated: boolean = false;
  
  constructor() {
    this.sessionManager = new SessionManager();
    this.audioHandler = new AudioHandler();
    this.openAIRealtime = new OpenAIRealtime();
  }
  
  async init(onMessage: (event: any) => void): Promise<void> {
    try {
      console.log("Initializing WebRTC connection");
      
      // Initialize peer connection handler with message callback
      this.peerConnectionHandler = new PeerConnectionHandler(onMessage);
      
      // Get session token with improved error handling
      let sessionData;
      try {
        console.log("Requesting session token from edge function...");
        sessionData = await this.sessionManager.getSessionToken();
        
        if (!sessionData || !sessionData.client_secret?.value) {
          console.error("Invalid session token response:", sessionData);
          throw new Error("Failed to get valid session token. Please check your API keys and try again.");
        }
        
        console.log("Successfully received valid session token");
      } catch (tokenError) {
        console.error("Failed to get session token:", tokenError);
        // Propagate the error with a user-friendly message
        throw new Error(`Voice connection failed: ${tokenError.message || 'Unable to get authorization'}`);
      }
      
      this.hasReceivedSessionCreated = false;
      
      // Setup peer connection
      let pc;
      try {
        console.log("Setting up WebRTC peer connection...");
        pc = await this.peerConnectionHandler.setupPeerConnection();
        
        // Set up remote audio
        pc.ontrack = (event) => this.audioHandler.setupRemoteAudio(event);
      } catch (peerError) {
        console.error("Error setting up peer connection:", peerError);
        throw new Error("Failed to initialize voice connection. Please check your browser permissions.");
      }
      
      // Get microphone access with error handling
      let stream;
      try {
        console.log("Requesting microphone access...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone access granted, adding tracks to peer connection");
      } catch (micError) {
        console.error("Failed to access microphone:", micError);
        throw new Error("Microphone access denied. Please allow microphone access and try again.");
      }
      
      // Add all audio tracks from the microphone to the peer connection
      stream.getAudioTracks().forEach(track => {
        console.log("Adding audio track to peer connection:", track.label);
        pc.addTrack(track, stream);
      });
      
      // Create offer and set local description with error handling
      let offer;
      try {
        console.log("Creating WebRTC offer...");
        offer = await this.peerConnectionHandler.createLocalOffer();
        
        if (!offer.sdp) {
          throw new Error("Generated SDP offer is empty");
        }
        
        console.log("Local offer created successfully");
      } catch (offerError) {
        console.error("Failed to create offer:", offerError);
        throw new Error("Failed to create connection offer. Please try again.");
      }
      
      // Exchange SDP with OpenAI with robust error handling
      try {
        console.log("Exchanging SDP with OpenAI using token...");
        
        if (!sessionData.client_secret.value) {
          throw new Error("Missing authorization token");
        }
        
        const answer = await this.openAIRealtime.exchangeSDP(
          sessionData.client_secret.value, 
          offer.sdp
        );
        
        console.log("Received valid answer from OpenAI");
        
        // Set remote description
        await this.peerConnectionHandler.setRemoteDescription(answer);
        console.log("Remote description set successfully");
      } catch (sdpError) {
        console.error("SDP exchange failed:", sdpError);
        throw new Error(`Voice connection failed: ${sdpError.message || 'Communication error with voice service'}`);
      }
      
      // Set session created after successful connection
      setTimeout(() => {
        if (!this.hasReceivedSessionCreated) {
          console.log("Simulating session.created event after successful connection");
          this.hasReceivedSessionCreated = true;
          // Send the message through the data channel instead of directly calling onMessage
          this.sendMessage({ type: 'session.created' });
        }
      }, 500);
      
    } catch (error) {
      console.error("WebRTC connection error:", error);
      throw error;
    }
  }
  
  // Method to safely send messages through the data channel
  sendMessage(message: any): void {
    if (this.peerConnectionHandler) {
      this.peerConnectionHandler.sendMessage(message);
    } else {
      console.warn("Cannot send message - peer connection handler not initialized");
    }
  }
  
  addAudioTrack(microphone: MediaStream): void {
    this.peerConnectionHandler?.addAudioTrack(microphone);
  }
  
  setMuted(muted: boolean): void {
    this.audioHandler.setMuted(muted);
  }
  
  isSessionCreated(): boolean {
    return this.hasReceivedSessionCreated;
  }
  
  setSessionCreated(created: boolean): void {
    this.hasReceivedSessionCreated = created;
  }
  
  disconnect(): void {
    // Clean up peer connection
    this.peerConnectionHandler?.disconnect();
    
    // Clean up audio
    this.audioHandler.cleanup();
    
    console.log("WebRTC connection closed");
  }
}
