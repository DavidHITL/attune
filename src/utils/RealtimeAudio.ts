
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
      
      // Get token from edge function
      const response = await supabase.functions.invoke('realtime-token');
      
      if (response.error) {
        throw new Error(`Failed to get session token: ${response.error.message || 'Unknown error'}`);
      }
      
      const data = await response.data;
      
      if (!data || !data.client_secret?.value) {
        throw new Error("Invalid session token response");
      }
      
      this.statusCallback("Setting up audio...");
      
      // Create peer connection
      this.pc = new RTCPeerConnection();
      
      // Set up data channel for events
      this.dc = this.pc.createDataChannel("events");
      this.dc.onmessage = (event) => {
        try {
          const parsedEvent = JSON.parse(event.data);
          console.log("WebRTC event:", parsedEvent);
          this.messageCallback(parsedEvent);
          
          // Save user message when transcript is complete
          if (parsedEvent.type === "response.audio_transcript.done") {
            const content = parsedEvent.transcript?.text;
            if (content) {
              this.saveMessageCallback('user', content);
            }
          }
          
          // Save assistant message when response is complete
          if (parsedEvent.type === "response.done" && parsedEvent.delta?.content) {
            const content = parsedEvent.delta.content;
            this.saveMessageCallback('assistant', content);
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
