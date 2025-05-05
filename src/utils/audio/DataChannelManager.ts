
import { MessageCallback } from '../types';

export class DataChannelManager {
  private dataChannel: RTCDataChannel | null = null;
  private messageCallback: MessageCallback | null = null;
  private messageQueue: string[] = []; // Queue to store messages before channel is open

  constructor(messageCallback: MessageCallback | null = null) {
    this.dataChannel = null;
    this.messageCallback = messageCallback;
    this.messageQueue = [];
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
      this.flushMessageQueue();
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
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.log('[DataChannelManager] Data channel not open yet, queuing message');
      this.messageQueue.push(messageString);
      return;
    }
    
    try {
      this.dataChannel.send(messageString);
      console.log('[DataChannelManager] Message sent successfully');
    } catch (error) {
      console.error('[DataChannelManager] Error sending message:', error);
      // Queue the message if there was an error sending it
      this.messageQueue.push(messageString);
    }
  }

  // Flush any queued messages if the data channel is open
  private flushMessageQueue(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[DataChannelManager] Cannot flush queue - data channel not open');
      return;
    }
    
    console.log(`[DataChannelManager] Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.dataChannel.send(message);
          console.log('[DataChannelManager] Sent queued message');
        } catch (error) {
          console.error('[DataChannelManager] Error sending queued message:', error);
          // If sending fails, put it back at the front of the queue and stop trying
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  // Method to check if data channel is ready for sending
  isDataChannelReady(): boolean {
    return this.dataChannel !== null && this.dataChannel.readyState === 'open';
  }

  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    // Clear message queue
    this.messageQueue = [];
  }
}
