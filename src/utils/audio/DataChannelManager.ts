export class DataChannelManager {
  private dataChannel: RTCDataChannel | null = null;
  private messageQueue: any[] = [];
  private messageCallback: ((event: any) => void) | null = null;
  private isOpen: boolean = false;
  private messageCounter: number = 0;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private channelReadinessTimeout: ReturnType<typeof setTimeout> | null = null;
  private channelReadyPromise: Promise<boolean> | null = null;
  private channelReadyResolver: ((value: boolean) => void) | null = null;

  constructor() {
    this.dataChannel = null;
    this.messageQueue = [];
    this.messageCallback = null;
    this.isOpen = false;
    this.messageCounter = 0;
    this.channelReadinessTimeout = null;
    this.channelReadyPromise = null;
    this.channelReadyResolver = null;
    
    // Initialize the promise
    this.resetChannelReadyPromise();
  }
  
  private resetChannelReadyPromise() {
    this.channelReadyPromise = new Promise<boolean>((resolve) => {
      this.channelReadyResolver = resolve;
    });
  }

  setupDataChannel(peerConnection: RTCPeerConnection, options: RTCDataChannelInit = { ordered: true }): RTCDataChannel {
    console.log('[DataChannelManager] Creating data channel with options:', options);
    
    try {
      // PERFORMANCE: Use optimized data channel options for lower latency
      this.dataChannel = peerConnection.createDataChannel('events', {
        ...options,
        // Only add maxRetransmits if not already specified
        maxRetransmits: options.maxRetransmits || 3,
        // Prioritize data channel traffic
        priority: 'high'
      });
      
      this.dataChannel.onopen = () => {
        console.log('[DataChannelManager] Data channel opened');
        this.isOpen = true;
        
        // Clear any existing timeout
        if (this.channelReadinessTimeout) {
          clearTimeout(this.channelReadinessTimeout);
          this.channelReadinessTimeout = null;
        }
        
        // Resolve the channel ready promise
        if (this.channelReadyResolver) {
          this.channelReadyResolver(true);
        }
        
        // PERFORMANCE: Reduced flush delay for lower latency
        this.channelReadinessTimeout = setTimeout(() => {
          console.log('[DataChannelManager] Data channel ready timer fired, flushing queue');
          this.flushQueuedMessages();
          this.channelReadinessTimeout = null;
        }, 100); // Reduced delay for better responsiveness
      };
      
      this.dataChannel.onclose = () => {
        console.log('[DataChannelManager] Data channel closed');
        this.isOpen = false;
        
        // Reset the channel ready promise
        this.resetChannelReadyPromise();
        
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
        // Reset the channel ready promise
        this.resetChannelReadyPromise();
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
  
  // ENHANCED: Improved waitForDataChannelReady with shorter timeout
  async waitForDataChannelReady(timeoutMs: number = 3000): Promise<boolean> {
    if (this.isDataChannelReady()) {
      return true;
    }
    
    console.log('[DataChannelManager] Waiting for data channel to be ready...');
    
    // Create a timeout promise
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    });
    
    // Race the channel ready promise against the timeout
    const ready = await Promise.race([
      this.channelReadyPromise,
      timeoutPromise
    ]);
    
    console.log('[DataChannelManager] Data channel ready wait completed:', ready);
    return ready;
  }

  // ENHANCED: Prioritize newer messages for real-time applications
  sendMessage(message: any, retryCount: number = 0): boolean {
    // Check readiness with more detailed logging
    if (!this.isDataChannelReady()) {
      console.log('[DataChannelManager] Data channel not ready, queueing message:', message.type);
      
      // PERFORMANCE: For real-time events, replace older items of same type
      if (message.type.includes('audio') || message.type.includes('transcript')) {
        const existingIndex = this.messageQueue.findIndex(item => 
          item.message.type === message.type
        );
        
        if (existingIndex >= 0) {
          // Replace older audio/transcript message with newer one
          console.log(`[DataChannelManager] Replacing older ${message.type} message with newer one`);
          this.messageQueue[existingIndex] = { message, retryCount, timestamp: Date.now() };
          return false;
        }
      }
      
      // Queue the message
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
        }, 250 * Math.pow(1.5, retryCount)); // Faster exponential backoff
        return false;
      }
      
      return false;
    }
  }

  // ENHANCED: Prioritize session.update messages in the queue
  flushQueuedMessages(): boolean {
    // More detailed readiness check
    if (!this.isDataChannelReady()) {
      console.log('[DataChannelManager] Cannot flush queue, data channel not ready');
      return false;
    }
    
    // Print queue status
    console.log(`[DataChannelManager] Flushing ${this.messageQueue.length} queued messages`);
    
    if (this.messageQueue.length === 0) {
      return true;
    }
    
    // Copy queue and clear original
    const queueCopy = [...this.messageQueue];
    this.messageQueue = [];
    
    // PERFORMANCE: Sort messages - prioritize session.update and critical messages
    queueCopy.sort((a, b) => {
      // Priority for session.update messages
      if (a.message.type === 'session.update') return -1;
      if (b.message.type === 'session.update') return 1;
      
      // Then by timestamp (oldest first) for other messages
      return a.timestamp - b.timestamp;
    });
    
    // Send messages with priority
    let allSent = true;
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
    
    // Reset channel ready promise
    this.resetChannelReadyPromise();
    
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
