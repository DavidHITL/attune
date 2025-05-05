
import { MessageCallback } from '../types';

export class DataChannelManager {
  private dataChannel: RTCDataChannel | null = null;
  private messageCallback: MessageCallback | null = null;

  constructor(messageCallback: MessageCallback | null = null) {
    this.dataChannel = null;
    this.messageCallback = messageCallback;
  }

  setMessageCallback(callback: MessageCallback): void {
    this.messageCallback = callback;
  }

  setupDataChannel(peerConnection: RTCPeerConnection): RTCDataChannel {
    // Create data channel
    this.dataChannel = peerConnection.createDataChannel('messages');
    
    // Set up event handlers
    this.dataChannel.onmessage = (event) => {
      if (this.messageCallback) {
        try {
          const message = JSON.parse(event.data);
          this.messageCallback(message);
        } catch (error) {
          console.error('[DataChannelManager] Error parsing message:', error);
        }
      }
    };

    this.dataChannel.onopen = () => {
      console.log('[DataChannelManager] Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('[DataChannelManager] Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('[DataChannelManager] Data channel error:', error);
    };

    return this.dataChannel;
  }

  sendMessage(message: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[DataChannelManager] Cannot send message: data channel not open');
      return;
    }
    
    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      this.dataChannel.send(messageString);
      console.log('[DataChannelManager] Message sent successfully');
    } catch (error) {
      console.error('[DataChannelManager] Error sending message:', error);
    }
  }

  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
  }
}
