import { MessageCallback, StatusCallback, SaveMessageCallback } from '../types';
import { ConnectionManager } from './ConnectionManager';
import { MessageQueue } from './MessageQueue';
import { ResponseParser } from './ResponseParser';
import { EventHandler } from './EventHandler';
import { toast } from 'sonner';

export class RealtimeChat {
  private connectionManager: ConnectionManager;
  private messageQueue: MessageQueue;
  private responseParser: ResponseParser;
  private eventHandler: EventHandler;
  private isMuted: boolean = false;
  private microphonePaused: boolean = false;
  private userTranscriptAccumulator: string = '';
  
  constructor(
    private messageCallback: MessageCallback,
    private statusCallback: StatusCallback,
    private saveMessageCallback: SaveMessageCallback
  ) {
    // Initialize components
    this.messageQueue = new MessageQueue(saveMessageCallback);
    this.responseParser = new ResponseParser();
    
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
  }

  // Custom message event handler that will also watch for speech events
  private handleMessageEvent = (event: any): void => {
    // Pass all events to the original callback
    this.messageCallback(event);
    
    // Look for transcript events to save user messages
    if (event.type === "transcript" && event.transcript) {
      console.log("Handling transcript event for saving:", event.transcript.substring(0, 50));
      this.saveUserTranscript(event.transcript);
    }
    
    // Also handle audio transcript delta events
    if (event.type === "response.audio_transcript.delta" && event.delta?.text) {
      this.userTranscriptAccumulator += event.delta.text;
    }
    
    // Handle final transcript completion
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      console.log("Final audio transcript received:", event.transcript.text.substring(0, 50));
      this.saveUserTranscript(event.transcript.text);
      this.userTranscriptAccumulator = ''; // Reset accumulator
    }
    
    // Periodically save accumulated transcript if it's not empty
    if (this.userTranscriptAccumulator && this.userTranscriptAccumulator.length > 15) {
      console.log("Saving accumulated transcript:", this.userTranscriptAccumulator);
      this.saveUserTranscript(this.userTranscriptAccumulator);
      this.userTranscriptAccumulator = ''; // Reset after saving
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
    console.log("[RealtimeChat] Pausing microphone - standard pause");
    this.microphonePaused = true;
    this.connectionManager.pauseMicrophone();
  }
  
  resumeMicrophone() {
    // Only resume if not muted
    if (!this.isMuted) {
      console.log("[RealtimeChat] Resuming microphone - standard resume");
      this.microphonePaused = false;
      this.connectionManager.resumeMicrophone();
    } else {
      console.log("[RealtimeChat] Not resuming microphone because it is muted");
    }
  }

  // Force methods to ensure microphone state
  forceStopMicrophone() {
    console.log("[RealtimeChat] Force stopping microphone");
    this.microphonePaused = true;
    
    if (this.isMuted) {
      // When muted, completely stop the microphone at device level
      console.log("[RealtimeChat] Completely stopping microphone (device level)");
      this.connectionManager.completelyStopMicrophone();
    } else {
      // When not muted, just force pause
      this.connectionManager.forcePauseMicrophone();
    }
  }
  
  forceResumeMicrophone() {
    if (!this.isMuted) {
      console.log("[RealtimeChat] Force resuming microphone");
      this.microphonePaused = false;
      this.connectionManager.forceResumeMicrophone();
    } else {
      console.log("[RealtimeChat] Cannot force resume microphone while muted");
    }
  }
  
  isMicrophonePaused() {
    return this.microphonePaused || this.isMuted;
  }
  
  setMuted(muted: boolean) {
    console.log("[RealtimeChat] Setting muted state to", muted);
    this.isMuted = muted;
    
    // When muting, completely stop microphone to ensure it's completely disabled at device level
    if (muted) {
      console.log("[RealtimeChat] Mute ON: Completely stopping microphone at device level");
      this.connectionManager.completelyStopMicrophone();
    }
    // When unmuting, the microphone state will be managed by the calling code
  }
  
  // Add a method to manually save a user message with improved reliability
  saveUserMessage(content: string) {
    if (!content || content.trim() === '') {
      console.log("Skipping empty user message");
      return;
    }
    
    console.log("[RealtimeChat] Saving user message:", content.substring(0, 30) + "...");
    
    // Log the conversation ID being used for saving messages
    const queueStatus = this.messageQueue.getQueueStatus();
    console.log(`[RealtimeChat] Queue status before saving: ${JSON.stringify(queueStatus)}`);

    // Make multiple attempts to save the message
    this.attemptSaveUserMessage(content);
  }
  
  // New method to make multiple attempts at saving a user message
  private async attemptSaveUserMessage(content: string, attempt: number = 1) {
    const maxAttempts = 3;
    
    try {
      console.log(`[RealtimeChat] Attempt ${attempt} to save user message`);
      
      // Directly save the message via the callback
      const savedMsg = await this.saveMessageCallback({
        role: 'user',
        content: content
      });
      
      if (savedMsg && savedMsg.id) {
        console.log(`[RealtimeChat] Direct save successful for message with ID: ${savedMsg.id}`);
        toast.success("User message saved to database", {
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          duration: 3000,
        });
      } else {
        throw new Error("Save returned null or missing ID");
      }
    } catch (err) {
      console.error(`[RealtimeChat] Direct save failed (attempt ${attempt}):`, err);
      
      if (attempt < maxAttempts) {
        // Try again with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[RealtimeChat] Will retry in ${delayMs}ms...`);
        
        setTimeout(() => {
          this.attemptSaveUserMessage(content, attempt + 1);
        }, delayMs);
      } else {
        // Fall back to queue on direct save failure after all retries
        console.log("[RealtimeChat] All direct save attempts failed, falling back to message queue");
        this.messageQueue.queueMessage('user', content, true);
        
        toast.error("Failed direct save, using backup method", {
          description: err?.message || "Database error", 
          duration: 3000
        });
      }
    }
  }

  // Helper method to save user transcripts
  private saveUserTranscript(transcript: string) {
    if (!transcript || transcript.trim() === '') return;
    
    console.log(`[RealtimeChat] Saving user transcript: "${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`);
    this.saveUserMessage(transcript);
  }
  
  async disconnect() {
    const eventCounts = this.responseParser.getEventCounts();
    console.log("Event type counts:", eventCounts);
    
    // Save any accumulated transcript before disconnecting
    if (this.userTranscriptAccumulator && this.userTranscriptAccumulator.trim()) {
      console.log("Saving accumulated transcript before disconnect:", this.userTranscriptAccumulator);
      this.saveUserMessage(this.userTranscriptAccumulator);
    }
    
    // Flush any pending messages in the event handler
    this.eventHandler.flushPendingMessages();
    
    // Process any remaining messages in the queue
    await this.messageQueue.flushQueue();
    
    // Clean up resources
    this.connectionManager.disconnect();
    
    this.statusCallback("Disconnected");
  }
}
