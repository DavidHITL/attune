
export class DataChannelManager {
  private dataChannel: RTCDataChannel | null = null;
  private messageQueue: any[] = [];
  private messageCallback: ((event: any) => void) | null = null;
  private isOpen: boolean = false;
  private messageCounter: number = 0;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private channelReadinessTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.dataChannel = null;
    this.messageQueue = [];
    this.messageCallback = null;
    this.isOpen = false;
    this.messageCounter = 0;
    this.channelReadinessTimeout = null;
  }

  setupDataChannel(peerConnection: RTCPeerConnection): RTCDataChannel {
    console.log('[DataChannelManager] Creating data channel');
    
    try {
      this.dataChannel = peerConnection.createDataChannel('events', {
        ordered: true
      });
      
      this.dataChannel.onopen = () => {
        console.log('[DataChannelManager] Data channel opened');
        this.isOpen = true;
        
        // Clear any existing timeout
        if (this.channelReadinessTimeout) {
          clearTimeout(this.channelReadinessTimeout);
          this.channelReadinessTimeout = null;
        }
        
        // IMPROVED: More reliable queue flushing with delay to ensure stability
        // This avoids timing issues where the channel appears open but isn't fully ready
        this.channelReadinessTimeout = setTimeout(() => {
          console.log('[DataChannelManager] Data channel ready timer fired, flushing queue');
          this.flushQueuedMessages();
          this.channelReadinessTimeout = null;
        }, 300); // Small delay to ensure browser has fully established data channel
      };
      
      this.dataChannel.onclose = () => {
        console.log('[DataChannelManager] Data channel closed');
        this.isOpen = false;
        
        // Clear any existing timeout
        if (this.channelReadinessTimeout) {
          clearTimeout(this.channelReadinessTimeout);
          this.channelReadinessTimeout = null;
        }
      };
      
      this.dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[DataChannelManager] Received message:', data.type);
          
          if (this.messageCallback) {
            this.messageCallback(data);
          }
        } catch (error) {
          console.error('[DataChannelManager] Error processing message:', error);
        }
      };
      
      this.dataChannel.onerror = (error) => {
        console.error('[DataChannelManager] Data channel error:', error);
      };
      
      return this.dataChannel;
    } catch (error) {
      console.error('[DataChannelManager] Error creating data channel:', error);
      throw error;
    }
  }

  setMessageCallback(callback: (event: any) => void): void {
    this.messageCallback = callback;
  }

  // IMPROVED: More reliable data channel readiness check
  isDataChannelReady(): boolean {
    if (!this.dataChannel) {
      console.log('[DataChannelManager] No data channel established');
      return false;
    }
    
    const isReady = this.dataChannel.readyState === 'open';
    if (!isReady) {
      console.log('[DataChannelManager] Data channel not ready, state:', this.dataChannel.readyState);
    }
    
    return isReady;
  }

  sendMessage(message: any, retryCount: number = 0): boolean {
    // Check readiness with more detailed logging
    if (!this.isDataChannelReady()) {
      console.log('[DataChannelManager] Data channel not ready, queueing message:', message.type);
      this.messageQueue.push({ message, retryCount, timestamp: Date.now() });
      return false;
    }
    
    try {
      // Add message ID for debugging
      const messageWithId = {
        ...message,
        _messageId: `msg_${++this.messageCounter}`
      };
      
      console.log(`[DataChannelManager] Sending message ${messageWithId._messageId}:`, message.type);
      this.dataChannel!.send(JSON.stringify(messageWithId));
      return true;
    } catch (error) {
      console.error('[DataChannelManager] Error sending message:', error);
      
      // Retry logic for failed sends
      if (retryCount < this.MAX_RETRY_ATTEMPTS) {
        console.log(`[DataChannelManager] Retrying message send (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);
        setTimeout(() => {
          this.sendMessage(message, retryCount + 1);
        }, 500 * Math.pow(2, retryCount)); // Exponential backoff
        return false;
      }
      
      return false;
    }
  }

  flushQueuedMessages(): boolean {
    // More detailed readiness check
    if (!this.isDataChannelReady()) {
      console.log('[DataChannelManager] Cannot flush queue, data channel not ready');
      return false;
    }
    
    // Print queue status
    console.log(`[DataChannelManager] Flushing ${this.messageQueue.length} queued messages`);
    
    // Send oldest messages first (FIFO)
    let allSent = true;
    const queueCopy = [...this.messageQueue];
    this.messageQueue = [];
    
    // Sort by timestamp to ensure oldest first
    queueCopy.sort((a, b) => a.timestamp - b.timestamp);
    
    for (const item of queueCopy) {
      const sent = this.sendMessage(item.message, item.retryCount);
      allSent = allSent && sent;
      
      if (!sent) {
        console.warn('[DataChannelManager] Failed to send queued message:', item.message.type);
      }
    }
    
    return allSent;
  }

  // IMPROVED: Better cleanup
  close(): void {
    // Clear any existing timeout
    if (this.channelReadinessTimeout) {
      clearTimeout(this.channelReadinessTimeout);
      this.channelReadinessTimeout = null;
    }
    
    if (this.dataChannel) {
      try {
        console.log('[DataChannelManager] Closing data channel');
        this.dataChannel.close();
      } catch (e) {
        console.warn('[DataChannelManager] Error closing data channel:', e);
      }
      this.dataChannel = null;
    }
    
    this.messageQueue = [];
    this.isOpen = false;
  }
}
