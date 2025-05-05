
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
      
      // Get session token
      const sessionData = await this.sessionManager.getSessionToken();
      
      this.hasReceivedSessionCreated = false;
      
      // Setup peer connection
      const pc = await this.peerConnectionHandler.setupPeerConnection();
      
      // Set up remote audio
      pc.ontrack = (event) => this.audioHandler.setupRemoteAudio(event);
      
      // Important: Get microphone access BEFORE creating the offer
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted, adding tracks to peer connection");
      
      // Add all audio tracks from the microphone to the peer connection
      stream.getAudioTracks().forEach(track => {
        console.log("Adding audio track to peer connection:", track.label);
        pc.addTrack(track, stream);
      });
      
      // Create offer and set local description
      const offer = await this.peerConnectionHandler.createLocalOffer();
      
      // Exchange SDP with OpenAI
      const answer = await this.openAIRealtime.exchangeSDP(
        sessionData.client_secret.value, 
        offer.sdp!
      );
      
      console.log("Received answer from OpenAI:", answer);
      
      // Set remote description
      await this.peerConnectionHandler.setRemoteDescription(answer);
      
      // Set session created after successful connection
      setTimeout(() => {
        if (!this.hasReceivedSessionCreated) {
          console.log("Simulating session.created event after successful connection");
          onMessage({ type: 'session.created' });
          this.hasReceivedSessionCreated = true;
        }
      }, 500);
      
    } catch (error) {
      console.error("WebRTC connection error:", error);
      throw error;
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
