
/**
 * Base class for handling WebRTC peer connections
 */
export abstract class PeerConnectionBase {
  protected peerConnection: RTCPeerConnection | null = null;
  protected dataChannel: RTCDataChannel | null = null;
  protected callError: string | null = null;

  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.callError = null;
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
      stream.getAudioTracks().forEach(track => {
        console.log('[WebRTC] Adding audio track:', track.label);
        this.peerConnection?.addTrack(track, stream);
      });
    } catch (error) {
      console.error('[WebRTC] Error adding audio track:', error);
    }
  }
}
