
import { PeerConnectionBase } from './PeerConnectionBase';
import { VoiceTokenFetcher } from './VoiceTokenFetcher';
import { DataChannelManager } from './DataChannelManager';
import { MessageCallback } from '../types';

export class WebRTCConnection extends PeerConnectionBase {
  private channelId: string | null = null;
  private messageCallback: MessageCallback | null = null;
  private dataChannelManager: DataChannelManager;
  private isTestMode: boolean;
  
  constructor(testMode: boolean = false) {
    super();
    this.channelId = null;
    this.messageCallback = null;
    this.dataChannelManager = new DataChannelManager();
    this.isTestMode = testMode;
  }
  
  async init(messageCallback: MessageCallback): Promise<void> {
    this.messageCallback = messageCallback;
    this.dataChannelManager.setMessageCallback(messageCallback);
    
    try {
      // Create WebRTC peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Set up data channel for messages
      this.dataChannel = this.dataChannelManager.setupDataChannel(this.peerConnection);
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTCConnection] New ICE candidate');
        }
      };
      
      // Handle tracks (for receiving audio)
      this.peerConnection.ontrack = (event) => {
        console.log('[WebRTCConnection] Remote track received:', event.track.kind);
        if (this.messageCallback) {
          // Forward the track event to the message handler
          this.messageCallback(event);
        }
      };
      
      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Wait for ICE gathering to complete
      await this.waitForIceGatheringComplete();
      
      if (!this.peerConnection.localDescription) {
        throw new Error('No local description available');
      }
      
      try {
        // Get token from Supabase Edge Function
        let response;
        
        if (this.isTestMode) {
          console.log('[WebRTCConnection] Using test mode with dummy token');
          response = await VoiceTokenFetcher.fetchTestToken();
        } else {
          response = await VoiceTokenFetcher.fetchVoiceToken(
            this.peerConnection.localDescription
          );
        }
        
        // Apply remote description
        const { answer, iceServers } = response;
        
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(typeof answer === 'string' ? JSON.parse(answer) : answer)
        );
        
        console.log('[WebRTCConnection] Connection established');
      } catch (e) {
        console.error('[WebRTCConnection] Connection error:', e);
        this.setCallError('Voice connection failed. Please refresh your API keys or try later.');
        this.teardownPeer();
        throw e;
      }
    } catch (error) {
      console.error('[WebRTCConnection] Error initializing connection:', error);
      throw error;
    }
  }
  
  sendMessage(message: any): void {
    this.dataChannelManager.sendMessage(message);
  }
  
  override disconnect(): void {
    this.dataChannelManager.close();
    super.disconnect();
    this.channelId = null;
    this.messageCallback = null;
  }
}
