import { supabase } from '@/integrations/supabase/client';
import { MessageCallback } from '../types';

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private channelId: string | null = null;
  private messageCallback: MessageCallback | null = null;
  private callError: string | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  constructor() {
    this.peerConnection = null;
    this.channelId = null;
    this.messageCallback = null;
    this.callError = null;
    this.dataChannel = null;
  }
  
  private setCallError(message: string) {
    this.callError = message;
    console.warn('[Voice] UI error:', this.callError);
  }
  
  async init(messageCallback: MessageCallback): Promise<void> {
    this.messageCallback = messageCallback;
    
    try {
      // Create WebRTC peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Set up data channel for messages
      this.dataChannel = this.peerConnection.createDataChannel('messages');
      this.dataChannel.onmessage = (event) => {
        if (this.messageCallback) {
          try {
            const message = JSON.parse(event.data);
            this.messageCallback(message);
          } catch (error) {
            console.error('[WebRTCConnection] Error parsing message:', error);
          }
        }
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTCConnection] New ICE candidate');
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
        const { answer, iceServers } = await this.fetchVoiceToken(this.peerConnection.localDescription);
        
        // Apply remote description
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
        
        console.log('[WebRTCConnection] Connection established');
      } catch (e) {
        console.error(e);
        this.setCallError('Voice connection failed. Please refresh your API keys or try later.');
        this.teardownPeer();
        throw e;
      }
    } catch (error) {
      console.error('[WebRTCConnection] Error initializing connection:', error);
      throw error;
    }
  }
  
  private async fetchVoiceToken(offer: RTCSessionDescriptionInit) {
    // TODO: Verify SUPABASE edge function name and deployment
    const response = await supabase.functions.invoke('realtime-token', { 
      body: { offer } 
    });

    // Enhanced error handling
    if (response.error) {
      console.error('[WebRTCConnection] Edge function error:', response.error);
      throw new Error(`VoiceConnectionError: Edge function returned error: ${response.error.message}`);
    }
    
    if (!response.data) {
      console.error('[WebRTCConnection] Empty response from edge function');
      throw new Error('VoiceConnectionError: No data received from server');
    }
    
    // Validate response structure
    if (typeof response.data !== 'object') {
      console.error('[WebRTCConnection] Expected JSON object, got:', response.data);
      throw new Error('VoiceConnectionError: Malformed response from server');
    }
    
    // Check if response has required fields
    if (!response.data.answer) {
      console.error('[WebRTCConnection] Missing answer in response:', response.data);
      throw new Error('VoiceConnectionError: Missing SDP answer from server');
    }
    
    try {
      // Verify the answer is valid JSON before continuing
      JSON.parse(response.data.answer);
    } catch (error) {
      console.error('[WebRTCConnection] Invalid SDP answer format:', error);
      throw new Error('VoiceConnectionError: Invalid SDP answer format');
    }
    
    return response.data as { answer: string; iceServers?: RTCIceServer[] };
  }
  
  private teardownPeer() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
  
  private waitForIceGatheringComplete(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.peerConnection) {
        resolve();
        return;
      }
      
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      
      const checkState = () => {
        if (this.peerConnection?.iceGatheringState === 'complete') {
          resolve();
        }
      };
      
      this.peerConnection.addEventListener('icegatheringstatechange', checkState);
      
      // Timeout for ice gathering
      setTimeout(() => {
        resolve();
        console.log('[WebRTCConnection] ICE gathering timed out, proceeding anyway');
      }, 5000);
    });
  }
  
  // Add the missing sendMessage method
  sendMessage(message: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[WebRTCConnection] Cannot send message: data channel not open');
      return;
    }
    
    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      this.dataChannel.send(messageString);
      console.log('[WebRTCConnection] Message sent successfully');
    } catch (error) {
      console.error('[WebRTCConnection] Error sending message:', error);
    }
  }
  
  addAudioTrack(stream: MediaStream): void {
    if (!this.peerConnection) {
      console.error('[WebRTCConnection] Cannot add track: no peer connection');
      return;
    }
    
    try {
      stream.getAudioTracks().forEach(track => {
        console.log('[WebRTCConnection] Adding audio track:', track.label);
        this.peerConnection?.addTrack(track, stream);
      });
    } catch (error) {
      console.error('[WebRTCConnection] Error adding audio track:', error);
    }
  }
  
  setMuted(muted: boolean): void {
    if (!this.peerConnection) {
      console.warn('[WebRTCConnection] Cannot set muted state: no peer connection');
      return;
    }
    
    this.peerConnection.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === 'audio') {
        sender.track.enabled = !muted;
        console.log(`[WebRTCConnection] ${muted ? 'Muted' : 'Unmuted'} audio track`);
      }
    });
  }
  
  disconnect(): void {
    console.log('[WebRTCConnection] Disconnecting...');
    
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    
    if (this.peerConnection) {
      // Close connection
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.dataChannel = null;
    this.channelId = null;
    this.messageCallback = null;
    console.log('[WebRTCConnection] Disconnected');
  }
}
