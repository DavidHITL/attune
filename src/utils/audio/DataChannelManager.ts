
import { MessageCallback } from '../types';

export class DataChannelManager {
  private dataChannel: RTCDataChannel | null = null;
  private messageCallback: MessageCallback | null = null;
  private queuedMessages: any[] = [];
  private isOpen: boolean = false;

  constructor() {
    this.dataChannel = null;
    this.messageCallback = null;
    this.queuedMessages = [];
    this.isOpen = false;
  }

  setMessageCallback(callback: MessageCallback): void {
    this.messageCallback = callback;
  }

  setupDataChannel(peerConnection: RTCPeerConnection): RTCDataChannel {
    // Create the data channel with improved reliability settings
    this.dataChannel = peerConnection.createDataChannel('oai-realtime', {
      ordered: true,
      maxRetransmits: 3
    });

    this.dataChannel.onopen = () => {
      console.log('[DataChannelManager] Data channel opened');
      this.isOpen = true;
      this.flushQueuedMessages();
    };

    this.dataChannel.onclose = () => {
      console.log('[DataChannelManager] Data channel closed');
      this.isOpen = false;
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        if (this.messageCallback) {
          this.messageCallback(parsedData);
        }
      } catch (error) {
        console.error('[DataChannelManager] Error parsing message:', error);
      }
    };

    return this.dataChannel;
  }

  // Send message through the data channel, queue if not ready
  sendMessage(message: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.log('[DataChannelManager] Data channel not ready, queueing message:', message.type);
      this.queuedMessages.push(message);
      return;
    }

    try {
      const messageString = JSON.stringify(message);
      this.dataChannel.send(messageString);
      console.log('[DataChannelManager] Message sent successfully');
    } catch (error) {
      console.error('[DataChannelManager] Error sending message:', error);
    }
  }

  // Flush queued messages when data channel is ready
  private flushQueuedMessages(): void {
    console.log(`[DataChannelManager] Flushing ${this.queuedMessages.length} queued messages`);
    
    while (this.queuedMessages.length > 0) {
      const message = this.queuedMessages.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  // Check if data channel is ready to send messages
  isDataChannelReady(): boolean {
    return this.dataChannel !== null && this.dataChannel.readyState === 'open';
  }

  // Close and clean up the data channel
  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    this.isOpen = false;
    this.queuedMessages = [];
  }
}
