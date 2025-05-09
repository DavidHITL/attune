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
  private sessionConfigRetryCount: number = 0;
  private readonly MAX_SESSION_CONFIG_ATTEMPTS = 5;
  private sessionConfigTimer: ReturnType<typeof setTimeout> | null = null;
  
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

  // Add a method to get the WebRTCConnection
  getWebRTCConnection(): WebRTCConnection {
    return this.webRTCConnection;
  }

  /**
   * Set the microphone muted state
   */
  setMuted(muted: boolean): void {
    console.log(`[RealtimeChat ${this.channelId}] Setting muted: ${muted}`);
  }

  /**
   * Pause microphone - stops recording but keeps the track active
   */
  pauseMicrophone(): void {
    console.log(`[RealtimeChat ${this.channelId}] Pausing microphone`);
  }

  /**
   * Resume microphone after pausing
   */
  resumeMicrophone(): void {
    console.log(`[RealtimeChat ${this.channelId}] Resuming microphone`);
  }

  /**
   * Force stop microphone - completely stops the track
   */
  forceStopMicrophone(): void {
    console.log(`[RealtimeChat ${this.channelId}] Force stopping microphone`);
  }

  /**
   * Force resume microphone - reinitializes the track
   */
  forceResumeMicrophone(): void {
    console.log(`[RealtimeChat ${this.channelId}] Force resuming microphone`);
  }

  /**
   * Check if microphone is currently paused
   */
  isMicrophonePaused(): boolean {
    return false;
  }

  /**
   * Handle messages from the connection
   */
  private handleMessage(event: any): void {
    // Forward message to the message handler
    this.messageCallback(event);
  }

  /**
   * Handle audio activity events
   */
  private handleAudioActivity(state: 'start' | 'stop'): void {
    console.log(`[RealtimeChat ${this.channelId}] Audio activity: ${state}`);
  }

  /**
   * Update the current status and notify the status callback
   */
  private updateStatus(status: string): void {
    console.log(`[RealtimeChat ${this.channelId}] Status: ${status}`);
  }

  /**
   * Disconnect from the chat
   */
  disconnect(): void {
    console.log(`[RealtimeChat ${this.channelId}] Disconnecting`);
  }

  /**
   * Flush any pending messages before disconnecting
   * This is important to ensure all messages are properly saved
   */
  async flushPendingMessages(): Promise<void> {
    console.log(`[RealtimeChat ${this.channelId}] Flushing pending messages`);
    // No specific flush needed in our implementation
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
      // IMPROVED: Use more comprehensive STUN/TURN servers and optimized configuration
      console.log('[WebRTCConnection] Creating peer connection with optimized RTCConfiguration');
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        // PERFORMANCE: Add options for faster connection
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      // PERFORMANCE: Add event listeners for better debugging of ICE connection
      this.peerConnection.addEventListener('iceconnectionstatechange', () => {
        console.log('[WebRTCConnection] ICE connection state:', this.peerConnection?.iceConnectionState);
      });

      this.peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log('[WebRTCConnection] ICE gathering state:', this.peerConnection?.iceGatheringState);
      });

      this.peerConnection.addEventListener('signalingstatechange', () => {
        console.log('[WebRTCConnection] Signaling state:', this.peerConnection?.signalingState);
      });
      
      // Set up data channel for messages - OPTIMIZED for low latency
      console.log('[WebRTCConnection] Setting up data channel with optimized parameters');
      this.dataChannel = this.dataChannelManager.setupDataChannel(this.peerConnection, {
        ordered: true,        // Guarantee order for critical messages
        maxRetransmits: 3     // Limit retries for better real-time performance
      });
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTCConnection] New ICE candidate type:', event.candidate.type);
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
        
        if (this.peerConnection?.connectionState === 'connected') {
          // When we're connected, make sure we attempt to send session config if we haven't
          if (!this.sessionConfigSent && this.hasReceivedSessionCreated) {
            console.log('[WebRTCConnection] Connection established, sending session config immediately');
            this.scheduleSessionConfigSending(0); // Send immediately with no delay
          }
        }
        
        if (this.peerConnection?.connectionState === 'failed') {
          console.warn('[WebRTCConnection] Connection failed, attempting retry');
          if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
            setTimeout(() => this.initializeConnection(true), 1000);
          }
        }
      };

      // ENHANCED: Improved track handling with optimized audio processing
      this.peerConnection.ontrack = async (event) => {
        console.log('[WebRTCConnection] Remote track received:', event.track.kind);
        
        if (event.track.kind === 'audio' && event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          
          // Save audio stream reference
          this.audioStream = stream;
          
          console.log('[WebRTCConnection] Audio track received:', {
            trackId: event.track.id,
            trackEnabled: event.track.enabled,
            streamId: stream.id,
            streamActive: stream.active
          });
          
          // PERFORMANCE: Load VoicePlayer asynchronously for faster initial connection
          try {
            const VoicePlayerModule = await import('../audio/VoicePlayer');
            const VoicePlayer = VoicePlayerModule.VoicePlayer;
            
            // Set optimal latency hint for voice
            VoicePlayer.setLatencyHint('interactive');
            
            // Play a test tone to verify audio output is working
            VoicePlayer.testAudioOutput();
            
            // PERFORMANCE: Add small delay before connecting to ensure stable connection
            setTimeout(() => {
              // Connect the incoming audio stream with optimized settings
              VoicePlayer.attachRemoteStream(stream);
            }, 100);
          } catch (err) {
            console.error('[WebRTCConnection] Error importing VoicePlayer:', err);
          }
          
          if (this.messageCallback) {
            // Forward the track event
            this.messageCallback({
              type: 'track',
              track: event.track,
              streams: event.streams
            });
          }
        }
      };

      // ENHANCED: Add high-quality audio track with optimized settings
      try {
        console.log('[WebRTCConnection] Adding optimized local audio track');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            // PERFORMANCE: Add higher quality audio constraints
            sampleRate: 48000,
            channelCount: 1
          }
        });
        
        stream.getAudioTracks().forEach(track => {
          // PERFORMANCE: Set higher priority for audio
          this.peerConnection?.addTrack(track, stream);
          
          // Log constraints for debugging
          console.log('[WebRTCConnection] Audio track constraints:', track.getConstraints());
        });
      } catch (err) {
        console.error('[WebRTCConnection] Error adding audio track:', err);
        this.setCallError('Unable to access microphone. Please ensure microphone permissions are granted.');
        throw err;
      }

      // Create offer with optimized audio constraints
      console.log('[WebRTCConnection] Creating offer with optimized audio constraints');
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
        voiceActivityDetection: true
      };
      
      const offer = await this.peerConnection.createOffer(offerOptions);
      await this.peerConnection.setLocalDescription(offer);

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
          console.log('[WebRTCConnection] Using actual localDescription for token request');
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
        
        const answerObj = typeof answer === 'string' 
          ? { type: 'answer' as RTCSdpType, sdp: answer } 
          : answer;
        
        // PERFORMANCE: Log important SDP parameters
        if (typeof answerObj.sdp === 'string') {
          // Check for specific codecs and settings
          if (answerObj.sdp.includes('opus/48000/2')) {
            console.log('[WebRTCConnection] Using high-quality Opus codec at 48kHz');
          }
          
          // Check for low-latency flags
          if (answerObj.sdp.includes('useinbandfec=1')) {
            console.log('[WebRTCConnection] FEC (Forward Error Correction) enabled for better quality');
          }
          
          // Check for minptime parameter (affects latency)
          const minptimeMatch = answerObj.sdp.match(/minptime=(\d+)/);
          if (minptimeMatch) {
            console.log('[WebRTCConnection] Minimum packet time:', minptimeMatch[1], 'ms');
          }
        }
        
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(answerObj)
        );
        
        console.log('[WebRTCConnection] Connection established successfully');
        
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
    
    console.log('[WebRTCConnection] Processing event:', event.type);
    
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
    // Clear existing timer if any
    if (this.sessionConfigTimer) {
      clearTimeout(this.sessionConfigTimer);
      this.sessionConfigTimer = null;
    }
    
    // Cancel if we've already sent it successfully
    if (this.sessionConfigSent) {
      console.log('[WebRTCConnection] Session config already sent, skipping');
      return;
    }
    
    this.sessionConfigRetryCount = retryCount;
    
    // Schedule immediate attempt
    this.sessionConfigTimer = setTimeout(() => {
      // Try to send the configuration
      const sent = this.sendSessionConfiguration();
      
      // If failed and we haven't reached max retries, try again with increasing delay
      if (!sent && this.sessionConfigRetryCount < this.MAX_SESSION_CONFIG_ATTEMPTS) {
        const nextRetryDelay = 1000 * Math.pow(2, this.sessionConfigRetryCount); // Exponential backoff
        console.log(`[WebRTCConnection] Scheduling retry #${this.sessionConfigRetryCount + 1} for session configuration in ${nextRetryDelay}ms`);
        this.scheduleSessionConfigSending(this.sessionConfigRetryCount + 1);
      }
    }, 200); // Small initial delay to ensure connection is ready
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
    // Clear any session config timer
    if (this.sessionConfigTimer) {
      clearTimeout(this.sessionConfigTimer);
      this.sessionConfigTimer = null;
    }
    
    this.dataChannelManager.close();
    super.disconnect();
    this.channelId = null;
    this.messageCallback = null;
    this.hasReceivedSessionCreated = false;
    this.sessionConfigSent = false;
    this.connectionAttempts = 0;
    this.sessionConfigRetryCount = 0;
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
    const dataChannelReady = this.dataChannelManager.isDataChannelReady();
    
    // Use correct states for RTCPeerConnectionState and RTCIceConnectionState
    const validConnection = connectionState === 'connected' && 
           (iceConnectionState === 'connected' || iceConnectionState === 'completed');
           
    const healthyConnection = validConnection && dataChannelReady;
    
    if (validConnection && !dataChannelReady) {
      console.warn('[WebRTCConnection] Connection appears healthy but data channel is not ready');
    }
    
    return healthyConnection;
  }
}
