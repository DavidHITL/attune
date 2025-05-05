
/**
 * Base class for handling WebRTC peer connections
 */
export abstract class PeerConnectionBase {
  protected peerConnection: RTCPeerConnection | null = null;
  protected dataChannel: RTCDataChannel | null = null;
  protected callError: string | null = null;
  protected messageQueue: string[] = []; // Queue to store messages before channel is open

  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.callError = null;
    this.messageQueue = [];
  }

  protected setCallError(message: string) {
    this.callError = message;
    console.warn('[Voice] UI error:', this.callError);
  }

  protected async waitForIceGatheringComplete(): Promise<void> {
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
        console.log('[WebRTC] ICE gathering timed out, proceeding anyway');
      }, 5000);
    });
  }

  // Flush any queued messages if the data channel is open
  protected flushMessageQueue(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }
    
    console.log(`[WebRTC] Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.dataChannel.send(message);
        } catch (error) {
          console.error('[WebRTC] Error sending queued message:', error);
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  protected teardownPeer() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  public disconnect(): void {
    console.log('[WebRTC] Disconnecting...');
    
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    
    if (this.peerConnection) {
      // Close connection
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.dataChannel = null;
    // Clear message queue
    this.messageQueue = [];
    console.log('[WebRTC] Disconnected');
  }

  public setMuted(muted: boolean): void {
    if (!this.peerConnection) {
      console.warn('[WebRTC] Cannot set muted state: no peer connection');
      return;
    }
    
    this.peerConnection.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === 'audio') {
        sender.track.enabled = !muted;
        console.log(`[WebRTC] ${muted ? 'Muted' : 'Unmuted'} audio track`);
      }
    });
  }

  public addAudioTrack(stream: MediaStream): void {
    if (!this.peerConnection) {
      console.error('[WebRTC] Cannot add track: no peer connection');
      return;
    }
    
    try {
      // Check if we already have audio tracks to avoid duplicates
      const senders = this.peerConnection.getSenders();
      const hasSenders = senders.length > 0;
      console.log(`[WebRTC] Current peer connection has ${senders.length} senders`);
      
      if (!hasSenders) {
        // Only add tracks if none exist
        stream.getAudioTracks().forEach(track => {
          console.log('[WebRTC] Adding audio track:', track.label);
          this.peerConnection?.addTrack(track, stream);
        });
      } else {
        console.log('[WebRTC] Audio tracks already added, skipping');
      }
    } catch (error) {
      console.error('[WebRTC] Error adding audio track:', error);
    }
  }
}
