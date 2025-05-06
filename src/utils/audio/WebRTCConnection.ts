
import { PeerConnectionBase } from './PeerConnectionBase';
import { VoiceTokenFetcher } from './VoiceTokenFetcher';
import { DataChannelManager } from './DataChannelManager';
import { MessageCallback } from '../types';

export class WebRTCConnection extends PeerConnectionBase {
  private channelId: string | null = null;
  private messageCallback: MessageCallback | null = null;
  private dataChannelManager: DataChannelManager;
  private isTestMode: boolean;
  private audioStream: MediaStream | null = null;
  
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
      // Create WebRTC peer connection with specific configuration for audio
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
      
      // ENHANCED: Improved track handling with detailed logging
      this.peerConnection.ontrack = (event) => {
        console.log('[WebRTCConnection] Remote track received:', event.track.kind);
        console.log('[WebRTCConnection] Track ID:', event.track.id);
        console.log('[WebRTCConnection] Stream ID:', event.streams[0]?.id);
        
        if (event.track.kind === 'audio' && event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          
          // Save audio stream reference for potential troubleshooting
          this.audioStream = stream;
          
          // Log incoming audio track details
          console.log('[WebRTCConnection] Audio track received:', {
            trackId: event.track.id,
            trackLabel: event.track.label,
            trackEnabled: event.track.enabled,
            streamId: stream.id,
            streamActive: stream.active,
            audioTracks: stream.getAudioTracks().length
          });
          
          // Try to play a test tone to verify audio output is working
          // This can help wake up the audio system on some browsers
          import('../audio/VoicePlayer').then(module => {
            const VoicePlayer = module.VoicePlayer;
            // Play a test tone to verify audio system is working
            VoicePlayer.testAudioOutput();
            // Connect the incoming audio stream
            VoicePlayer.attachRemoteStream(stream);
          });
          
          if (this.messageCallback) {
            // Forward the track event to the message handler
            this.messageCallback(event);
          }
        }
      };
      
      // CRITICAL CHANGE: Add audio track to ensure the SDP offer includes audio media section
      try {
        console.log('[WebRTCConnection] Adding local audio track');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        // Add all audio tracks from the stream to the peer connection
        stream.getAudioTracks().forEach(track => {
          console.log('[WebRTCConnection] Adding audio track:', track.label);
          this.peerConnection.addTrack(track, stream);
        });
      } catch (err) {
        console.error('[WebRTCConnection] Error adding audio track:', err);
        this.setCallError('Unable to access microphone. Please ensure microphone permissions are granted.');
        throw err;
      }
      
      // Create offer with specific audio constraints
      console.log('[WebRTCConnection] Creating offer with audio constraints');
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      };
      
      const offer = await this.peerConnection.createOffer(offerOptions);
      await this.peerConnection.setLocalDescription(offer);
      
      // Verify that SDP has audio section
      if (offer.sdp && !offer.sdp.includes('m=audio')) {
        console.error('[WebRTCConnection] Generated SDP offer does not contain audio section!');
        console.log('[WebRTCConnection] SDP offer:', offer.sdp);
        throw new Error('WebRTC offer missing audio section. Check microphone access.');
      } else {
        console.log('[WebRTCConnection] SDP offer contains audio section');
      }
      
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
        
        console.log('[WebRTCConnection] Answer type:', typeof answer);
        
        const answerObj = typeof answer === 'string' 
          ? { type: 'answer' as RTCSdpType, sdp: answer } 
          : answer;
        
        // Log the complete SDP answer before applying it
        console.log('[WebRTCConnection] SDP answer:', answerObj.sdp);
        
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
  
  // Add explicit method to add audio track after connection is established
  addAudioTrack(stream: MediaStream): void {
    if (!this.peerConnection) {
      console.error('[WebRTCConnection] Cannot add track, no peer connection');
      return;
    }
    
    stream.getAudioTracks().forEach(track => {
      console.log('[WebRTCConnection] Adding additional audio track:', track.label);
      this.peerConnection?.addTrack(track, stream);
    });
  }
  
  sendMessage(message: any): void {
    this.dataChannelManager.sendMessage(message);
  }
  
  // Check connection state
  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }
  
  // Get audio levels for debugging
  getAudioStatus(): { localTracks: number, remoteTracks: number, streamActive: boolean } {
    return {
      localTracks: this.peerConnection?.getSenders().filter(s => s.track?.kind === 'audio').length || 0,
      remoteTracks: this.peerConnection?.getReceivers().filter(r => r.track?.kind === 'audio').length || 0,
      streamActive: this.audioStream?.active || false
    };
  }
  
  override disconnect(): void {
    this.dataChannelManager.close();
    super.disconnect();
    this.channelId = null;
    this.messageCallback = null;
  }
}
