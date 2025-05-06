
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
  private hasReceivedSessionCreated: boolean = false;
  private sessionConfigSent: boolean = false;
  private connectionAttempts: number = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;
  
  constructor(testMode: boolean = false) {
    super();
    this.channelId = null;
    this.messageCallback = null;
    this.dataChannelManager = new DataChannelManager();
    this.isTestMode = testMode;
    this.hasReceivedSessionCreated = false;
    this.sessionConfigSent = false;
    this.connectionAttempts = 0;
  }
  
  async init(messageCallback: MessageCallback): Promise<void> {
    this.messageCallback = messageCallback;
    
    // Wrap the message callback to handle session events
    const enhancedMessageCallback: MessageCallback = (event) => {
      // First process specific events that need immediate response
      this.handleSessionEvents(event);
      
      // Then pass the event to the original callback
      if (this.messageCallback) {
        this.messageCallback(event);
      }
    };
    
    this.dataChannelManager.setMessageCallback(enhancedMessageCallback);
    
    try {
      await this.initializeConnection();
    } catch (error) {
      console.error('[WebRTCConnection] Error initializing connection:', error);
      throw error;
    }
  }

  private async initializeConnection(isRetry: boolean = false): Promise<void> {
    if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
      console.error('[WebRTCConnection] Maximum connection attempts reached');
      throw new Error('Failed to establish connection after multiple attempts');
    }
    
    this.connectionAttempts++;
    console.log(`[WebRTCConnection] Connection attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS}`);
    
    // Cleanup existing connection if this is a retry
    if (isRetry && this.peerConnection) {
      console.log('[WebRTCConnection] Cleaning up previous connection for retry');
      this.teardownPeer();
    }
    
    try {
      // CRITICAL FIX: We'll get ICE servers from the edge function later
      // but start with a basic configuration that won't be changed after setup
      // This avoids the InvalidModificationError
      console.log('[WebRTCConnection] Creating peer connection');
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        iceCandidatePoolSize: 10 // Increase candidate pool for better connectivity
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
      
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTCConnection] ICE connection state changed:', this.peerConnection?.iceConnectionState);
        
        // Handle failed ICE connections
        if (this.peerConnection?.iceConnectionState === 'failed') {
          console.warn('[WebRTCConnection] ICE connection failed, attempting retry');
          if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
            setTimeout(() => this.initializeConnection(true), 1000);
          }
        }
      };
      
      // Connection state monitoring
      this.peerConnection.onconnectionstatechange = () => {
        console.log('[WebRTCConnection] Connection state changed:', this.peerConnection?.connectionState);
        
        if (this.peerConnection?.connectionState === 'failed') {
          console.warn('[WebRTCConnection] Connection failed, attempting retry');
          if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
            setTimeout(() => this.initializeConnection(true), 1000);
          }
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
          }).catch(err => {
            console.error('[WebRTCConnection] Error importing VoicePlayer:', err);
          });
          
          if (this.messageCallback) {
            // Forward the track event to the message handler
            this.messageCallback({
              type: 'track',
              track: event.track,
              streams: event.streams
            });
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
          this.peerConnection?.addTrack(track, stream);
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
        offerToReceiveVideo: false,
        voiceActivityDetection: true
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
      
      if (!this.peerConnection?.localDescription) {
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
        
        if (!this.peerConnection) {
          console.error('[WebRTCConnection] Peer connection is null when setting remote description');
          throw new Error('Peer connection is null when setting remote description');
        }
        
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(answerObj)
        );
        
        // FIX: Don't try to modify ICE servers after connection setup
        // Instead, save them for future connections if needed
        if (iceServers && iceServers.length > 0) {
          console.log('[WebRTCConnection] Received ICE servers from server:', iceServers.length);
          // We no longer call setConfiguration here to avoid InvalidModificationError
          // Just log them for now
        }
        
        console.log('[WebRTCConnection] Connection established');
        
        // Reset connection attempts on success
        this.connectionAttempts = 0;
      } catch (e) {
        console.error('[WebRTCConnection] Connection error:', e);
        
        if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
          console.log(`[WebRTCConnection] Retrying connection (attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS})`);
          this.teardownPeer();
          return this.initializeConnection(true);
        } else {
          this.setCallError('Voice connection failed. Please refresh your API keys or try later.');
          this.teardownPeer();
          throw e;
        }
      }
    } catch (error) {
      console.error('[WebRTCConnection] Error in connection initialization:', error);
      throw error;
    }
  }
  
  // CRITICAL METHOD: Handle session events and respond with appropriate configuration
  private handleSessionEvents(event: any): void {
    // Only process events with a valid type
    if (!event || !event.type) return;
    
    // When session.created event is received, send session configuration
    if (event.type === 'session.created') {
      this.hasReceivedSessionCreated = true;
      console.log('[WebRTCConnection] Session created event received, sending session.update');
      
      // IMPROVED: More robust session config sending with retry
      this.scheduleSessionConfigSending();
    }
  }
  
  // NEW: Add a more robust session configuration scheduling with retries
  private scheduleSessionConfigSending(retryCount: number = 0): void {
    // Maximum number of retries
    const MAX_RETRIES = 3;
    
    // Cancel if we've already sent it successfully
    if (this.sessionConfigSent) {
      console.log('[WebRTCConnection] Session config already sent, skipping');
      return;
    }
    
    // Schedule immediate attempt
    setTimeout(() => {
      // Try to send the configuration
      const sent = this.sendSessionConfiguration();
      
      // If failed and we haven't reached max retries, try again with increasing delay
      if (!sent && retryCount < MAX_RETRIES) {
        const nextRetryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
        console.log(`[WebRTCConnection] Scheduling retry #${retryCount + 1} for session configuration in ${nextRetryDelay}ms`);
        setTimeout(() => {
          this.scheduleSessionConfigSending(retryCount + 1);
        }, nextRetryDelay);
      }
    }, 100); // Small initial delay to ensure connection is ready
  }
  
  // Send session configuration after session is created
  private sendSessionConfiguration(): boolean {
    if (!this.dataChannelManager.isDataChannelReady()) {
      console.error('[WebRTCConnection] Cannot send session.update: data channel not ready');
      return false;
    }
    
    // Create the session.update message with required audio configuration
    const sessionConfig = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { 
          model: "whisper-1" 
        },
        turn_detection: {
          type: "server_vad", // Let the server detect turns
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        }
      }
    };
    
    // Send the configuration through the data channel
    console.log('[WebRTCConnection] Sending session configuration:', sessionConfig);
    const sent = this.dataChannelManager.sendMessage(sessionConfig);
    
    if (sent) {
      console.log('[WebRTCConnection] Session configuration sent successfully');
      this.sessionConfigSent = true;
    } else {
      console.error('[WebRTCConnection] Failed to send session configuration');
    }
    
    return sent;
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
  
  // Get audio status for debugging
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
    this.hasReceivedSessionCreated = false;
    this.sessionConfigSent = false;
    this.connectionAttempts = 0;
  }
  
  // Add method to force sending session config (for retry attempts)
  forceSendSessionConfig(): void {
    this.sessionConfigSent = false;
    this.scheduleSessionConfigSending();
  }
  
  // Add method to check if session config has been sent
  hasSessionConfigBeenSent(): boolean {
    return this.sessionConfigSent;
  }
  
  // Method to check if connection is healthy
  isConnectionHealthy(): boolean {
    if (!this.peerConnection) return false;
    
    const connectionState = this.peerConnection.connectionState;
    const iceConnectionState = this.peerConnection.iceConnectionState;
    
    // Use correct states for RTCPeerConnectionState and RTCIceConnectionState
    return connectionState === 'connected' && 
           (iceConnectionState === 'connected' || iceConnectionState === 'completed');
  }
}
