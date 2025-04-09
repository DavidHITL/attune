// The existing RealtimeAudio implementation with updated conversation context handling

import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/hooks/useConversation";

type MessageEvent = {
  type: string;
  [key: string]: any;
};

type MessageCallback = (event: MessageEvent) => void;
type StatusCallback = (status: string) => void;
type SaveMessageCallback = (role: 'user' | 'assistant', content: string) => Promise<void>;

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement;
  private microphone: MediaStream | null = null;
  private messageCallback: MessageCallback;
  private statusCallback: StatusCallback;
  private saveMessageCallback: SaveMessageCallback;
  private isMicrophonePaused: boolean = false;
  private isMuted: boolean = false;
  private messageQueue: {role: 'user' | 'assistant', content: string}[] = [];
  private isProcessingQueue: boolean = false;
  private lastMessageSentTime: number = 0;
  private minTimeBetweenMessages: number = 500; // ms
  private hasReceivedSessionCreated: boolean = false;
  private userTranscript: string = '';
  private assistantResponse: string = '';
  private pendingAssistantMessage: boolean = false;
  private savedCurrentAssistantId: string | null = null;

  // Debug tracking
  private eventLog: {type: string, timestamp: number, contentPreview?: string}[] = [];
  private lastResponseDelta: number = 0;
  
  constructor(
    messageCallback: MessageCallback,
    statusCallback: StatusCallback,
    saveMessageCallback: SaveMessageCallback
  ) {
    this.messageCallback = messageCallback;
    this.statusCallback = statusCallback;
    this.saveMessageCallback = saveMessageCallback;
    this.audioElement = new Audio();
    this.audioElement.autoplay = true;
  }

  async init() {
    try {
      this.statusCallback("Connecting...");
      console.log("Initializing WebRTC connection");
      
      // Get auth token to pass to the edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Failed to get auth session:", sessionError);
      }
      
      // Get token from edge function
      const accessToken = session?.access_token || null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Only add Authorization header if we have a token
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        console.log("Using authentication token for edge function");
      } else {
        console.log("No authentication token available");
      }
      
      const response = await supabase.functions.invoke('realtime-token', {
        headers: headers
      });
      
      if (response.error) {
        throw new Error(`Failed to get session token: ${response.error.message || 'Unknown error'}`);
      }
      
      const data = await response.data;
      
      if (!data || !data.client_secret?.value) {
        throw new Error("Invalid session token response");
      }
      
      // Log conversation context for debugging
      if (data.conversation_context) {
        console.log(
          "Conversation context:", 
          data.conversation_context.has_history ? 
            `Loaded ${data.conversation_context.message_count} previous messages` : 
            "No previous conversation history"
        );
      }
      
      this.hasReceivedSessionCreated = false;
      this.statusCallback("Setting up audio...");
      
      // Create peer connection
      this.pc = new RTCPeerConnection();
      
      // Set up data channel for events
      this.dc = this.pc.createDataChannel("events");
      this.dc.onmessage = (event) => {
        try {
          const parsedEvent = JSON.parse(event.data);
          this.logEvent(parsedEvent);
          this.messageCallback(parsedEvent);

          // Mark session as created when we receive that event
          if (parsedEvent.type === "session.created") {
            this.hasReceivedSessionCreated = true;
            console.log("Session created event received");
          }
          
          // Process events for user messages
          if (parsedEvent.type === "response.audio_transcript.delta" && parsedEvent.delta?.text) {
            // Accumulate transcript text
            this.userTranscript += parsedEvent.delta.text;
            console.log(`Accumulating user transcript: ${this.userTranscript}`);
          }
          
          if (parsedEvent.type === "response.audio_transcript.done" && parsedEvent.transcript?.text) {
            // Get the final transcript and save it
            const content = parsedEvent.transcript.text;
            if (content && content.trim()) {
              console.log("Final user transcript received:", content);
              this.queueMessage('user', content);
              // Reset transcript accumulator
              this.userTranscript = '';
            } else if (this.userTranscript && this.userTranscript.trim()) {
              // Fallback to accumulated transcript if final is missing
              console.log("Using accumulated user transcript:", this.userTranscript);
              this.queueMessage('user', this.userTranscript);
              this.userTranscript = '';
            } else {
              console.log("Empty user transcript, not saving");
            }
          }
          
          // Process events for assistant messages - UPDATED LOGIC
          if (parsedEvent.type === "response.created") {
            console.log("Assistant response started, setting pendingAssistantMessage flag");
            this.pendingAssistantMessage = true;
            this.assistantResponse = '';
            this.lastResponseDelta = Date.now();
          }
          
          // Handle response delta for text content - IMPROVED PARSING
          if (parsedEvent.type === "response.delta") {
            this.lastResponseDelta = Date.now();
            
            // Log full event structure for debugging
            console.log("Response delta structure:", JSON.stringify(parsedEvent));
            
            let deltaContent = null;
            
            // Try multiple paths to find the content
            if (parsedEvent.delta?.content) {
              deltaContent = parsedEvent.delta.content;
            } else if (parsedEvent.delta?.item?.content?.[0]?.text) {
              deltaContent = parsedEvent.delta.item.content[0].text;
            } else if (parsedEvent.delta?.text) {
              deltaContent = parsedEvent.delta.text;
            }
            
            if (deltaContent) {
              if (this.pendingAssistantMessage) {
                this.assistantResponse += deltaContent;
                console.log(`Accumulating assistant response (${this.assistantResponse.length} chars): "${this.assistantResponse.substring(0, 50)}${this.assistantResponse.length > 50 ? '...' : ''}"`);
              } else {
                console.warn("Received response delta without pending message flag");
              }
            } else {
              console.warn("Response delta received but couldn't extract content:", parsedEvent);
            }
          }
          
          // Handle assistant message completion - IMPROVED COMPLETION DETECTION
          if (parsedEvent.type === "response.done") {
            console.log("Response done event received");
            
            // Try to extract the full response from the done event if available
            let fullResponse = null;
            
            if (parsedEvent.response?.items) {
              // Try to find message items in the response
              const messageItems = parsedEvent.response.items.filter((item: any) => 
                item.type === 'message' && item.role === 'assistant'
              );
              
              if (messageItems.length > 0) {
                const latestMessage = messageItems[messageItems.length - 1];
                if (latestMessage.content) {
                  fullResponse = Array.isArray(latestMessage.content) 
                    ? latestMessage.content.map((c: any) => c.text || '').join('')
                    : latestMessage.content;
                  
                  console.log("Extracted full response from response.done event:", fullResponse.substring(0, 50) + (fullResponse.length > 50 ? '...' : ''));
                }
              }
            }
            
            // Save the complete assistant response
            if (this.pendingAssistantMessage) {
              // Prefer the accumulated response if it has content
              const finalContent = this.assistantResponse && this.assistantResponse.trim() 
                ? this.assistantResponse 
                : (fullResponse || '');
                
              if (finalContent && finalContent.trim()) {
                console.log(`Saving assistant response [${finalContent.length} chars]: "${finalContent.substring(0, 50)}${finalContent.length > 50 ? '...' : ''}"`);
                this.queueMessage('assistant', finalContent);
              } else {
                console.error("Empty assistant response, cannot save. Accumulated response length:", 
                  this.assistantResponse?.length || 0, 
                  "Full response available:", 
                  !!fullResponse);
              }
              
              this.pendingAssistantMessage = false;
              this.assistantResponse = '';
            } else {
              // If no pending message flag but we have full response content, try to save it
              if (fullResponse && fullResponse.trim()) {
                console.log("Saving assistant response from done event without pending flag.");
                this.queueMessage('assistant', fullResponse);
              } else {
                console.warn("Response done event with no pending message and no content to save");
              }
            }
          }
        } catch (e) {
          console.error("Error parsing event data:", e);
        }
      };
      
      // Set up remote audio
      this.pc.ontrack = (event) => {
        console.log("Track received:", event);
        this.audioElement.srcObject = event.streams[0];
      };
      
      // Get user's microphone
      this.microphone = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Add audio track to the peer connection
      this.microphone.getAudioTracks().forEach(track => {
        if (this.pc) {
          this.pc.addTrack(track, this.microphone!);
          console.log("Added audio track to peer connection:", track.label);
        }
      });
      
      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      
      // Connect to OpenAI's Realtime API
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${data.client_secret.value}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`OpenAI SDP exchange failed: ${errorText}`);
      }
      
      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");
      
      // Start activity detection
      this.detectAudioActivity();
      
      // Send session.created event
      this.messageCallback({
        type: "session.created",
        hasHistory: data.conversation_context?.has_history || false,
        messageCount: data.conversation_context?.message_count || 0
      });
      
      this.statusCallback("Connected");
      
    } catch (error) {
      console.error("WebRTC connection error:", error);
      this.statusCallback("Connection failed");
      throw error;
    }
  }

  // Log event for debugging purposes
  private logEvent(event: any) {
    const eventInfo = {
      type: event.type,
      timestamp: Date.now()
    } as {type: string, timestamp: number, contentPreview?: string};
    
    // Add content preview for certain events
    if (event.delta?.content) {
      eventInfo.contentPreview = event.delta.content.substring(0, 30);
    } else if (event.transcript?.text) {
      eventInfo.contentPreview = event.transcript.text.substring(0, 30);
    }
    
    this.eventLog.push(eventInfo);
    
    // Keep event log from growing too large
    if (this.eventLog.length > 100) {
      this.eventLog.shift();
    }
    
    // Log detailed debug info for key events
    console.log(`EVENT [${event.type}] at ${new Date().toISOString()}`);
  }

  // Queue message saving to prevent race conditions or failures
  private queueMessage(role: 'user' | 'assistant', content: string) {
    // Don't save empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return;
    }
    
    // Check if we've saved the same message recently (debounce)
    const now = Date.now();
    if (now - this.lastMessageSentTime < this.minTimeBetweenMessages) {
      console.log(`Message received too quickly after previous one, checking for duplicates`);
      
      // Check for duplicate content in queue
      if (this.messageQueue.some(msg => 
        msg.role === role && 
        msg.content.trim() === content.trim()
      )) {
        console.log(`Duplicate ${role} message detected, skipping`);
        return;
      }
    }
    
    this.lastMessageSentTime = now;
    
    this.messageQueue.push({ role, content });
    console.log(`Queued ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
    console.log(`Queue length: ${this.messageQueue.length}`);
    this.processMessageQueue();
  }

  // Process message queue to ensure sequential saving
  private async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      const message = this.messageQueue.shift();
      if (message) {
        console.log(`Processing ${message.role} message from queue: "${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}"`);
        
        // Retry loop for saving messages
        let attempts = 0;
        const maxAttempts = 3;
        let saved = false;
        
        while (!saved && attempts < maxAttempts) {
          try {
            await this.saveMessageCallback(message.role, message.content);
            console.log(`Successfully saved ${message.role} message to database (attempt ${attempts + 1})`);
            saved = true;
          } catch (error) {
            attempts++;
            console.error(`Error saving message (attempt ${attempts}):`, error);
            if (attempts < maxAttempts) {
              console.log(`Retrying in ${attempts * 1000}ms...`);
              await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            } else {
              console.error(`Failed to save message after ${maxAttempts} attempts`);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in message queue processing:", error);
    } finally {
      this.isProcessingQueue = false;
      
      // Process next message if any
      if (this.messageQueue.length > 0) {
        setTimeout(() => this.processMessageQueue(), 100); // Small delay between processing items
      }
    }
  }
  
  private detectAudioActivity() {
    try {
      if (!this.microphone || this.isMicrophonePaused) return;
      
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.microphone);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStart: number | null = null;
      let isSpeaking = false;
      
      const checkAudioLevel = () => {
        if (!this.audioContext || this.isMicrophonePaused) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average audio level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Define thresholds
        const speakingThreshold = 20;  // Adjust based on testing
        const silenceThreshold = 5000; // 5 seconds of silence
        
        if (average > speakingThreshold && !isSpeaking) {
          // User started speaking
          isSpeaking = true;
          silenceStart = null;
          this.messageCallback({
            type: 'input_audio_activity_started'
          });
        } else if (average <= speakingThreshold && isSpeaking) {
          // User might have stopped speaking, start silence timer
          if (!silenceStart) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > silenceThreshold) {
            // Silence threshold reached, consider speech ended
            isSpeaking = false;
            silenceStart = null;
            this.messageCallback({
              type: 'input_audio_activity_stopped'
            });
          }
        } else if (!isSpeaking) {
          // Reset silence timer during continuous silence
          silenceStart = null;
        }
        
        // Continue checking if still connected
        if (this.dc && this.dc.readyState === 'open') {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      
      requestAnimationFrame(checkAudioLevel);
      
    } catch (error) {
      console.error("Error in audio activity detection:", error);
    }
  }
  
  pauseMicrophone() {
    if (!this.microphone) return;
    
    this.isMicrophonePaused = true;
    this.microphone.getAudioTracks().forEach(track => {
      track.enabled = false;
    });
    
    console.log("Microphone paused");
  }
  
  resumeMicrophone() {
    if (!this.microphone) return;
    
    this.isMicrophonePaused = false;
    this.microphone.getAudioTracks().forEach(track => {
      track.enabled = true;
    });
    
    console.log("Microphone resumed");
    // Restart activity detection
    this.detectAudioActivity();
  }
  
  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
  }
  
  disconnect() {
    console.log(`Disconnecting with ${this.messageQueue.length} messages in queue`);
    console.log(`Event log summary: ${this.eventLog.length} events`);
    
    // If there's a pending assistant message, save it now
    if (this.pendingAssistantMessage && this.assistantResponse && this.assistantResponse.trim()) {
      console.log("Saving pending assistant response during disconnect:", this.assistantResponse.substring(0, 30) + "...");
      // Add directly to queue for processing
      this.messageQueue.push({ 
        role: 'assistant', 
        content: this.assistantResponse 
      });
      this.assistantResponse = '';
      this.pendingAssistantMessage = false;
    } else if (this.pendingAssistantMessage && Date.now() - this.lastResponseDelta > 5000) {
      // If we haven't received response deltas for 5+ seconds, log this issue
      console.warn("Pending assistant message with no content and no recent deltas during disconnect");
    }
    
    // Process any remaining messages in the queue synchronously
    const remainingMessages = [...this.messageQueue];
    this.messageQueue = [];
    
    // Process each remaining message synchronously
    const processRemaining = async () => {
      for (const msg of remainingMessages) {
        try {
          console.log(`Processing message during disconnect: ${msg.role} - ${msg.content.substring(0, 30)}...`);
          await this.saveMessageCallback(msg.role, msg.content);
          console.log(`Successfully saved message during disconnect`);
        } catch (error) {
          console.error("Error saving message during disconnect:", error);
        }
      }
      
      // Save any partial transcripts or responses that weren't saved yet
      if (this.userTranscript && this.userTranscript.trim()) {
        try {
          console.log("Saving partial user transcript during disconnect:", this.userTranscript);
          await this.saveMessageCallback('user', this.userTranscript);
        } catch (error) {
          console.error("Error saving partial user transcript during disconnect:", error);
        }
      }
    };
    
    // Start processing remaining messages
    processRemaining();
    
    try {
      // Close data channel
      if (this.dc) {
        this.dc.close();
        this.dc = null;
      }
      
      // Close peer connection
      if (this.pc) {
        this.pc.close();
        this.pc = null;
      }
      
      // Stop microphone tracks
      if (this.microphone) {
        this.microphone.getTracks().forEach(track => track.stop());
        this.microphone = null;
      }
      
      // Close audio context
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      // Reset audio element
      if (this.audioElement) {
        this.audioElement.srcObject = null;
      }
      
      this.statusCallback("Disconnected");
      console.log("WebRTC connection closed");
    } catch (error) {
      console.error("Error during disconnect:", error);
    }
  }
}
