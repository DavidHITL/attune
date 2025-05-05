
// Import the ConnectionManager from the audio folder 
import { ConnectionManager } from '../audio/ConnectionManager';
import { MessageCallback, StatusCallback, SaveMessageCallback } from '../types';
import { MicrophoneControlManager } from './microphone/MicrophoneControlManager';

/**
 * Main class for handling Realtime Chat interactions
 * This maintains the connection to OpenAI and handles both audio and text messages
 */
export class RealtimeChat {
  private connectionManager: ConnectionManager;
  private status: string = 'disconnected';
  private connectionId: string;
  private testMode: boolean;
  private microphoneManager: MicrophoneControlManager;

  constructor(
    private messageHandler: MessageCallback,
    private statusCallback: StatusCallback,
    private saveMessageCallback?: SaveMessageCallback,
    testMode: boolean = false
  ) {
    this.connectionId = Math.random().toString(36).substring(2, 9);
    this.testMode = testMode;
    console.log(`[RealtimeChat ${this.connectionId}] Creating new instance with test mode: ${testMode}`);
    
    // Create connection manager to handle the WebRTC connection
    this.connectionManager = new ConnectionManager(
      this.handleMessage.bind(this),
      this.handleAudioActivity.bind(this),
      this.saveMessageCallback,
      this.testMode
    );
    
    // Create microphone manager to handle microphone controls
    this.microphoneManager = new MicrophoneControlManager(this.connectionManager);
  }

  async init(): Promise<void> {
    try {
      console.log(`[RealtimeChat ${this.connectionId}] Initializing connection`);
      await this.connectionManager.initialize();
      console.log(`[RealtimeChat ${this.connectionId}] Connection initialized successfully`);
      this.updateStatus('connected');
    } catch (error) {
      console.error(`[RealtimeChat ${this.connectionId}] Error initializing:`, error);
      this.updateStatus('error');
      throw error;
    }
  }

  /**
   * Set the microphone muted state
   */
  setMuted(muted: boolean): void {
    console.log(`[RealtimeChat ${this.connectionId}] Setting muted: ${muted}`);
    this.microphoneManager.setMuted(muted);
  }

  /**
   * Pause microphone - stops recording but keeps the track active
   */
  pauseMicrophone(): void {
    console.log(`[RealtimeChat ${this.connectionId}] Pausing microphone`);
    this.microphoneManager.pauseMicrophone();
  }

  /**
   * Resume microphone after pausing
   */
  resumeMicrophone(): void {
    console.log(`[RealtimeChat ${this.connectionId}] Resuming microphone`);
    this.microphoneManager.resumeMicrophone();
  }

  /**
   * Force stop microphone - completely stops the track
   */
  forceStopMicrophone(): void {
    console.log(`[RealtimeChat ${this.connectionId}] Force stopping microphone`);
    this.microphoneManager.forceStopMicrophone();
  }

  /**
   * Force resume microphone - reinitializes the track
   */
  forceResumeMicrophone(): void {
    console.log(`[RealtimeChat ${this.connectionId}] Force resuming microphone`);
    this.microphoneManager.forceResumeMicrophone();
  }

  /**
   * Check if microphone is currently paused
   */
  isMicrophonePaused(): boolean {
    return this.microphoneManager.isMicrophonePaused();
  }

  /**
   * Handle messages from the connection
   */
  private handleMessage(event: any): void {
    // Forward message to the message handler
    this.messageHandler(event);
  }

  /**
   * Handle audio activity events
   */
  private handleAudioActivity(state: 'start' | 'stop'): void {
    console.log(`[RealtimeChat ${this.connectionId}] Audio activity: ${state}`);
  }

  /**
   * Update the current status and notify the status callback
   */
  private updateStatus(status: string): void {
    console.log(`[RealtimeChat ${this.connectionId}] Status: ${status}`);
    this.status = status;
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  /**
   * Disconnect from the chat
   */
  disconnect(): void {
    console.log(`[RealtimeChat ${this.connectionId}] Disconnecting`);
    this.connectionManager.disconnect();
    this.updateStatus('disconnected');
  }

  /**
   * Flush any pending messages before disconnecting
   * This is important to ensure all messages are properly saved
   */
  async flushPendingMessages(): Promise<void> {
    console.log(`[RealtimeChat ${this.connectionId}] Flushing pending messages`);
    // No specific flush needed in our implementation
  }
}
