import { MessageCallback, StatusCallback, SaveMessageCallback } from '../types';
import { ConnectionManager } from './ConnectionManager';
import { MessageQueue } from './messageQueue';
import { ResponseParser } from './ResponseParser';
import { EventHandler } from './EventHandler';
import { UserMessageHandler } from './user-messages/UserMessageHandler';
import { MicrophoneManager } from './microphone/MicrophoneManager';
import { TranscriptEventHandler } from './events/TranscriptEventHandler';
import { toast } from 'sonner';

export class RealtimeChat {
  private connectionManager: ConnectionManager;
  private messageQueue: MessageQueue;
  private responseParser: ResponseParser;
  private eventHandler: EventHandler;
  private userMessageHandler: UserMessageHandler;
  private microphoneManager: MicrophoneManager;
  private transcriptHandler: TranscriptEventHandler;
  
  constructor(
    private messageCallback: MessageCallback,
    private statusCallback: StatusCallback,
    private saveMessageCallback: SaveMessageCallback
  ) {
    // Initialize components
    this.messageQueue = new MessageQueue(saveMessageCallback);
    this.responseParser = new ResponseParser();
    this.userMessageHandler = new UserMessageHandler(saveMessageCallback);
    
    // Create the event handler with the message queue and response parser
    this.eventHandler = new EventHandler(
      this.messageQueue, 
      this.responseParser, 
      this.handleMessageEvent
    );
    
    // Create connection manager with event handler and message saving capability
    this.connectionManager = new ConnectionManager(
      this.eventHandler.handleMessage,
      (state) => {
        this.messageCallback({
          type: state === 'start' ? 'input_audio_activity_started' : 'input_audio_activity_stopped'
        });
      },
      saveMessageCallback
    );
    
    // Create microphone manager
    this.microphoneManager = new MicrophoneManager(this.connectionManager);
    
    // Make a direct reference to saveMessageCallback for userMessageHandler
    this.userMessageHandler = new UserMessageHandler(saveMessageCallback);
    
    // Create transcript event handler with improved user message handling
    this.transcriptHandler = new TranscriptEventHandler(
      (text) => {
        console.log(`📣 TranscriptEventHandler - Direct save for text: "${text.substring(0, 30)}..."`);
        this.saveUserMessage(text);
      },
      (text) => this.userMessageHandler.accumulateTranscript(text),
      () => this.userMessageHandler.saveTranscriptIfNotEmpty()
    );
  }

  // Custom message event handler that will also watch for speech events
  private handleMessageEvent = (event: any): void => {
    // Pass all events to the original callback
    this.messageCallback(event);
    
    // Handle transcript events with improved user message handling
    this.transcriptHandler.handleTranscriptEvents(event);
    
    // Additional logging for transcript events
    if (event.type === 'transcript' || event.type === 'response.audio_transcript.done') {
      console.log(`🗣️ Transcript event detected [${event.type}]:`, {
        hasTranscript: !!event.transcript,
        hasTextProperty: !!(event.transcript && event.transcript.text),
        timestamp: new Date().toISOString()
      });
    }
    
    // Periodically save accumulated transcript if it's not empty
    const accumulator = this.userMessageHandler.getAccumulatedTranscript();
    if (accumulator && accumulator.length > 15) {
      console.log(`📝 Auto-saving accumulated transcript (${accumulator.length} chars)`);
      this.userMessageHandler.saveTranscriptIfNotEmpty();
    }
  }

  async init() {
    try {
      this.statusCallback("Connecting...");
      
      // Initialize the connection
      const connected = await this.connectionManager.initialize();
      
      if (connected) {
        this.statusCallback("Connected");
        return true;
      } else {
        throw new Error("Failed to establish connection");
      }
    } catch (error) {
      console.error("Connection error:", error);
      this.statusCallback("Connection failed");
      throw error;
    }
  }
  
  pauseMicrophone() {
    this.microphoneManager.pauseMicrophone();
  }
  
  resumeMicrophone() {
    this.microphoneManager.resumeMicrophone();
  }
  
  // Force methods to ensure microphone state
  forceStopMicrophone() {
    this.microphoneManager.forceStopMicrophone();
  }
  
  forceResumeMicrophone() {
    this.microphoneManager.forceResumeMicrophone();
  }
  
  isMicrophonePaused() {
    return this.microphoneManager.isMicrophonePaused();
  }
  
  setMuted(muted: boolean) {
    this.microphoneManager.setMuted(muted);
  }
  
  // Public method to manually save a user message with enhanced logging
  saveUserMessage(content: string) {
    if (!content || content.trim() === '') {
      console.log("⚠️ Skipping empty user message");
      return;
    }
    
    console.log(`💾 RealtimeChat.saveUserMessage called with: "${content.substring(0, 30)}..."`, {
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
    
    // Verify the saveMessageCallback is available
    if (!this.saveMessageCallback) {
      console.error("❌ saveMessageCallback is not available!");
      return;
    }
    
    // Try to save directly using the provided callback for maximum reliability
    this.saveMessageCallback({
      role: 'user',
      content: content
    }).then(result => {
      console.log(`✅ Direct save user message result:`, {
        success: !!result,
        messageId: result?.id,
        timestamp: new Date().toISOString()
      });
    }).catch(error => {
      console.error("❌ Direct save user message error:", error);
    });
    
    // Also try the regular handler as a backup
    this.userMessageHandler.saveUserMessage(content);
  }
  
  // Added method to flush pending messages
  flushPendingMessages() {
    console.log("💾 Flushing pending messages in RealtimeChat");
    // Try one last time to save any accumulated transcript
    const accumulator = this.userMessageHandler.getAccumulatedTranscript();
    if (accumulator && accumulator.trim() !== '') {
      console.log(`📝 Flushing accumulated transcript: "${accumulator.substring(0, 30)}..."`);
      this.saveUserMessage(accumulator);
      this.userMessageHandler.clearAccumulatedTranscript();
    }
    
    // Forward to event handler which manages message processing
    this.eventHandler.flushPendingMessages();
  }

  // Added method to accumulate transcript
  accumulateTranscript(text: string) {
    this.userMessageHandler.accumulateTranscript(text);
  }

  async disconnect() {
    const eventCounts = this.responseParser.getEventCounts();
    console.log("Event type counts:", eventCounts);
    
    // Save any accumulated transcript before disconnecting
    this.userMessageHandler.saveTranscriptIfNotEmpty();
    
    // Flush any pending messages in the event handler
    this.eventHandler.flushPendingMessages();
    
    // Process any remaining messages in the queue
    await this.messageQueue.flushQueue();
    
    // Clean up resources
    this.connectionManager.disconnect();
    
    this.statusCallback("Disconnected");
  }
}
