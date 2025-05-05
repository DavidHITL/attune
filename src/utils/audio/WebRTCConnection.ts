
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
    
    console.log(`[WebRTCConnection] Created with testMode=${testMode}`);
  }
  
  async init(messageCallback: MessageCallback): Promise<void> {
    this.messageCallback = messageCallback;
    this.dataChannelManager.setMessageCallback(messageCallback);
    
    try {
      // Create WebRTC peer connection
      console.log('[WebRTCConnection] Creating peer connection');
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Set up data channel for messages
      console.log('[WebRTCConnection] Setting up data channel');
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
      console.log('[WebRTCConnection] Creating offer');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Wait for ICE gathering to complete
      console.log('[WebRTCConnection] Waiting for ICE gathering to complete');
      await this.waitForIceGatheringComplete();
      
      if (!this.peerConnection.localDescription) {
        throw new Error('No local description available');
      }
      
      try {
        // Get token from Supabase Edge Function
        console.log('[WebRTCConnection] Fetching voice token');
        let response;
        
        if (this.isTestMode) {
          console.log('[WebRTCConnection] Using test mode with dummy token');
          response = await VoiceTokenFetcher.fetchTestToken();
        } else {
          console.log('[WebRTCConnection] Using actual localDescription:', 
            this.peerConnection.localDescription.type);
          response = await VoiceTokenFetcher.fetchVoiceToken(
            this.peerConnection.localDescription
          );
        }
        
        // Apply remote description
        console.log('[WebRTCConnection] Got response, applying remote description');
        const { answer, iceServers } = response;
        
        // Ensure answer is in the right format
        if (!answer) {
          throw new Error('No answer in response');
        }
        
        // Log the answer format for debugging
        console.log('[WebRTCConnection] Answer type:', typeof answer, 
          'structure:', JSON.stringify(answer).substring(0, 100) + '...');
        
        // Make sure we have a proper RTCSessionDescription object
        const answerObj = (typeof answer === 'string')
          ? { type: 'answer', sdp: answer } 
          : answer;
        
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(answerObj)
        );
        
        // Apply any ICE servers from the response
        if (iceServers && iceServers.length > 0) {
          console.log('[WebRTCConnection] Updating ICE servers:', iceServers.length);
          this.peerConnection.setConfiguration({
            iceServers: iceServers
          });
        }
        
        console.log('[WebRTCConnection] Connection established successfully');
        
        // Simulate conversation initialization for test mode
        if (this.isTestMode && this.messageCallback) {
          console.log('[WebRTCConnection] Test mode: Simulating session created event');
          setTimeout(() => {
            if (this.messageCallback) {
              this.messageCallback({ type: 'session.created', id: 'test-session-id' });
            }
          }, 500);
        }
      } catch (e) {
        console.error('[WebRTCConnection] Connection error:', e);
        this.setCallError('Voice connection failed. Please try again or check your API keys.');
        this.teardownPeer();
        throw e;
      }
    } catch (error) {
      console.error('[WebRTCConnection] Error initializing connection:', error);
      throw error;
    }
  }
  
  sendMessage(message: any): void {
    if (this.isTestMode) {
      console.log('[WebRTCConnection] Test mode: Simulating sending message:', message);
      // If in test mode, simulate response for specific message types
      if (message.type === 'session.update') {
        console.log('[WebRTCConnection] Test mode: Simulating session updated response');
        setTimeout(() => {
          if (this.messageCallback) {
            this.messageCallback({ 
              type: 'session.updated', 
              session: { ...message.session } 
            });
          }
        }, 300);
      }
      return;
    }
    
    this.dataChannelManager.sendMessage(message);
  }
  
  override disconnect(): void {
    this.dataChannelManager.close();
    super.disconnect();
    this.channelId = null;
    this.messageCallback = null;
  }
}
