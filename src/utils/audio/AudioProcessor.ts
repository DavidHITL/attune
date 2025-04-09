
import { AudioActivityCallback } from './types';

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private microphone: MediaStream | null = null;
  private isMicrophonePaused: boolean = false;
  private isMuted: boolean = false;

  constructor(private audioActivityCallback?: AudioActivityCallback) {}

  async initMicrophone(): Promise<MediaStream> {
    try {
      this.microphone = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log("Microphone initialized");
      
      // Start voice activity detection if callback is provided
      if (this.audioActivityCallback) {
        this.detectAudioActivity();
      }
      
      return this.microphone;
    } catch (error) {
      console.error("Error accessing microphone:", error);
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
          this.audioActivityCallback?.('start');
        } else if (average <= speakingThreshold && isSpeaking) {
          // User might have stopped speaking, start silence timer
          if (!silenceStart) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > silenceThreshold) {
            // Silence threshold reached, consider speech ended
            isSpeaking = false;
            silenceStart = null;
            this.audioActivityCallback?.('stop');
          }
        } else if (!isSpeaking) {
          // Reset silence timer during continuous silence
          silenceStart = null;
        }
        
        // Continue checking if connection is active
        requestAnimationFrame(checkAudioLevel);
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
    if (this.audioActivityCallback) {
      this.detectAudioActivity();
    }
  }
  
  setMuted(muted: boolean) {
    this.isMuted = muted;
  }
  
  isMicrophoneActive(): boolean {
    return !this.isMicrophonePaused && !!this.microphone;
  }
  
  cleanup() {
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
    
    console.log("Audio processor cleaned up");
  }
}
