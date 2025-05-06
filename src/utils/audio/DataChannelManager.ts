
import { MessageCallback } from '../types';

export class DataChannelManager {
  private dataChannel: RTCDataChannel | null = null;
  private messageCallback: MessageCallback | null = null;
  private queuedMessages: any[] = [];
  private isOpen: boolean = false;
  private channelOpenPromise: Promise<void> | null = null;
  private channelOpenResolve: (() => void) | null = null;

  constructor() {
    this.dataChannel = null;
    this.messageCallback = null;
    this.queuedMessages = [];
    this.isOpen = false;
    this.createChannelOpenPromise();
  }

  private createChannelOpenPromise() {
    this.channelOpenPromise = new Promise<void>((resolve) => {
      this.channelOpenResolve = resolve;
    });
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
      
      // Resolve the channel open promise
      if (this.channelOpenResolve) {
        this.channelOpenResolve();
      }
      
      this.flushQueuedMessages();
    };

    this.dataChannel.onclose = () => {
      console.log('[DataChannelManager] Data channel closed');
      this.isOpen = false;
      this.createChannelOpenPromise(); // Reset promise for potential reconnect
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
      console.log('[DataChannelManager] Message sent successfully:', message.type);
    } catch (error) {
      console.error('[DataChannelManager] Error sending message:', error);
      // Re-queue the message for retry
      this.queuedMessages.push(message);
      
      // Attempt to flush the queue after a delay
      setTimeout(() => this.flushQueuedMessages(), 1000);
    }
  }

  // Wait for the data channel to be open before sending messages
  async waitForOpen(timeoutMs: number = 10000): Promise<boolean> {
    if (this.isOpen) return true;
    
    if (!this.channelOpenPromise) {
      this.createChannelOpenPromise();
    }
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Data channel open timeout')), timeoutMs);
      });
      
      // Race the channel open promise against the timeout
      await Promise.race([this.channelOpenPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.error('[DataChannelManager] Timeout waiting for data channel to open');
      return false;
    }
  }

  // Flush queued messages when data channel is ready
  private flushQueuedMessages(): void {
    console.log(`[DataChannelManager] Flushing ${this.queuedMessages.length} queued messages`);
    
    let success = true;
    const failedMessages: any[] = [];
    
    while (this.queuedMessages.length > 0) {
      const message = this.queuedMessages.shift();
      if (message) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
          failedMessages.push(message);
          success = false;
          continue;
        }
        
        try {
          const messageString = JSON.stringify(message);
          this.dataChannel.send(messageString);
          console.log('[DataChannelManager] Successfully sent queued message:', message.type);
        } catch (error) {
          console.error('[DataChannelManager] Error sending queued message:', error);
          failedMessages.push(message);
          success = false;
        }
      }
    }
    
    // Re-queue failed messages for another attempt
    this.queuedMessages = [...failedMessages, ...this.queuedMessages];
    
    // If there are still messages in the queue, try again after a delay
    if (this.queuedMessages.length > 0) {
      setTimeout(() => this.flushQueuedMessages(), 1000);
    }
    
    return success;
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
    this.createChannelOpenPromise(); // Reset promise for potential reuse
  }
}
