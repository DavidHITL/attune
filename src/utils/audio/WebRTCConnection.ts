import { AudioHandler } from './AudioHandler';
import { VoicePlayer } from './VoicePlayer';

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioHandler: AudioHandler;
  private connectionId: string;
  
  constructor() {
    this.audioHandler = new AudioHandler();
    this.connectionId = `rtc-${Date.now().toString(36)}`;
  }
  
  async init(messageHandler: (event: any) => void): Promise<void> {
    console.log(`[WebRTCConnection ${this.connectionId}] Initializing WebRTC connection`);
    
    try {
      // Create peer connection with ICE servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      // Set up data channel for messaging
      this.dataChannel = this.peerConnection.createDataChannel('events');
      
      // Configure data channel event handlers
      this.dataChannel.onopen = () => {
        console.log(`[WebRTCConnection ${this.connectionId}] Data channel opened`);
      };
      
      this.dataChannel.onclose = () => {
        console.log(`[WebRTCConnection ${this.connectionId}] Data channel closed`);
      };
      
      this.dataChannel.onerror = (error) => {
        console.error(`[WebRTCConnection ${this.connectionId}] Data channel error:`, error);
      };
      
      this.dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          messageHandler(data);
        } catch (error) {
          console.error(`[WebRTCConnection ${this.connectionId}] Error parsing message:`, error);
        }
      };

      // Set up remote track handler for audio
      this.peerConnection.ontrack = (event) => {
        console.log(`[WebRTCConnection ${this.connectionId}] Remote track received:`, event.track.kind);
        
        if (event.track.kind === 'audio' && event.streams && event.streams.length > 0) {
          console.log(`[WebRTCConnection ${this.connectionId}] Attaching audio track to player`);
          // Use our VoicePlayer to handle audio output
          VoicePlayer.attachRemoteStream(event.streams[0]);
        } else {
          console.warn(`[WebRTCConnection ${this.connectionId}] Received track is not audio or has no streams`);
        }
      };

      // Set up ICE candidate handling
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[WebRTCConnection ${this.connectionId}] New ICE candidate`);
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log(`[WebRTCConnection ${this.connectionId}] ICE connection state:`, 
          this.peerConnection?.iceConnectionState);
      };
      
      // Create and set local description
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      console.log(`[WebRTCConnection ${this.connectionId}] Local description set`);
      
      // Get the token for OpenAI realtime API
      const { data, error } = await fetch('/api/realtime-token').then(res => res.json());
      
      if (error || !data?.token) {
        throw new Error(error || 'Failed to get token');
      }
      
      // Send offer to OpenAI and get answer
      const response = await fetch('https://api.openai.com/v1/audio/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sdp: offer.sdp }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get answer: ${response.statusText}`);
      }
      
      const answerSdp = await response.text();
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });
      
      console.log(`[WebRTCConnection ${this.connectionId}] Remote description set`);
      
    } catch (error) {
      console.error(`[WebRTCConnection ${this.connectionId}] Init error:`, error);
      throw error;
    }
  }
  
  addAudioTrack(mediaStream: MediaStream): void {
    if (!this.peerConnection) {
      console.error(`[WebRTCConnection ${this.connectionId}] Cannot add track: connection not initialized`);
      return;
    }
    
    try {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log(`[WebRTCConnection ${this.connectionId}] Adding audio track:`, audioTracks[0].label);
        this.peerConnection.addTrack(audioTracks[0], mediaStream);
      } else {
        console.error(`[WebRTCConnection ${this.connectionId}] No audio tracks found in media stream`);
      }
    } catch (error) {
      console.error(`[WebRTCConnection ${this.connectionId}] Error adding audio track:`, error);
    }
  }
  
  sendMessage(message: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error(`[WebRTCConnection ${this.connectionId}] Cannot send message: data channel not ready`);
      return;
    }
    
    try {
      const messageString = JSON.stringify(message);
      this.dataChannel.send(messageString);
      console.log(`[WebRTCConnection ${this.connectionId}] Message sent through data channel`);
    } catch (error) {
      console.error(`[WebRTCConnection ${this.connectionId}] Error sending message:`, error);
    }
  }
  
  setMuted(muted: boolean): void {
    this.audioHandler.setMuted(muted);
  }
  
  disconnect(): void {
    console.log(`[WebRTCConnection ${this.connectionId}] Disconnecting`);
    
    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Clean up audio resources
    this.audioHandler.cleanup();
    
    // Clean up VoicePlayer
    VoicePlayer.cleanup();
    
    console.log(`[WebRTCConnection ${this.connectionId}] Disconnected`);
  }
}
