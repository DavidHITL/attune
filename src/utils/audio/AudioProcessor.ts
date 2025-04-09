import { MediaRecorderState } from '@/utils/types';
import { SilenceDetector } from './SilenceDetector';
import { ActivityMonitor } from './ActivityMonitor';

export class AudioProcessor {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private microphoneActive: boolean = false;
  private activityCallback: (state: 'start' | 'stop') => void;
  private silenceDetector: SilenceDetector | null = null;
  private activityMonitor: ActivityMonitor | null = null;
  
  constructor(activityCallback: (state: 'start' | 'stop') => void) {
    this.activityCallback = activityCallback;
  }
  
  async initMicrophone(): Promise<MediaStream> {
    try {
      // Clean up any existing stream first
      this.releaseAllAudioTracks();
      
      // Get a fresh stream
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphoneActive = true;
      console.log("[AudioProcessor] Microphone initialized successfully");
      return this.audioStream;
    } catch (error) {
      console.error("[AudioProcessor] Error accessing microphone:", error);
      this.microphoneActive = false;
      throw error;
    }
  }
  
  async initAudioContext() {
    if (!this.audioStream) {
      throw new Error("Audio stream is not initialized. Call initMicrophone first.");
    }
    
    // Create silence detector with the audio stream
    this.silenceDetector = new SilenceDetector(this.audioStream);
    await this.silenceDetector.initialize();
    
    // Set up callback from silence detector to stop recording when silence is detected
    this.silenceDetector.onSilenceDetected(() => {
      this.stopRecording();
    });
    
    // Create activity monitor
    this.activityMonitor = new ActivityMonitor(this.audioStream);
  }
  
  startRecording() {
    if (!this.audioStream) {
      console.error("[AudioProcessor] No audio stream available. Call initMicrophone first.");
      return;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      console.warn("[AudioProcessor] MediaRecorder is already recording.");
      return;
    }
    
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.audioStream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = () => {
      console.log("[AudioProcessor] Recording stopped.");
    };
    
    this.mediaRecorder.start();
    this.activityCallback('start');
    console.log("[AudioProcessor] Recording started.");
  }
  
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.activityCallback('stop');
      console.log("[AudioProcessor] Stopping recording...");
    } else {
      console.warn("[AudioProcessor] MediaRecorder is not currently recording.");
    }
  }
  
  pauseMicrophone() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.enabled = false;
      });
      this.microphoneActive = false;
      console.log("[AudioProcessor] Microphone paused - tracks disabled");
    }
  }
  
  resumeMicrophone() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.enabled = true; 
      });
      this.microphoneActive = true;
      console.log("[AudioProcessor] Microphone resumed - tracks enabled");
    }
  }
  
  forcePauseMicrophone() {
    if (this.audioStream) {
      // More aggressive approach - both disable and mute tracks
      this.audioStream.getTracks().forEach(track => {
        track.enabled = false;
        if (track.kind === 'audio' && 'muted' in track) {
          try {
            // @ts-ignore - Some browsers support this
            track.muted = true;
          } catch (e) {
            // Ignore if not supported
          }
        }
      });
      this.microphoneActive = false;
      console.log("[AudioProcessor] Microphone FORCE paused - tracks disabled and muted");
    } else {
      console.log("[AudioProcessor] No audio stream to force pause");
    }
  }
  
  forceResumeMicrophone() {
    // Try to re-initialize the microphone if needed
    if (!this.audioStream || this.audioStream.getTracks().length === 0) {
      console.log("[AudioProcessor] No active audio stream, attempting to reinitialize");
      this.initMicrophone().then(stream => {
        console.log("[AudioProcessor] Microphone reinitialized successfully");
        this.microphoneActive = true;
      }).catch(err => {
        console.error("[AudioProcessor] Failed to reinitialize microphone:", err);
      });
      return;
    }
    
    // Otherwise enable all tracks in the current stream
    this.audioStream.getTracks().forEach(track => {
      track.enabled = true;
      if (track.kind === 'audio' && 'muted' in track) {
        try {
          // @ts-ignore - Some browsers support this
          track.muted = false;
        } catch (e) {
          // Ignore if not supported
        }
      }
    });
    this.microphoneActive = true;
    console.log("[AudioProcessor] Microphone FORCE resumed - all tracks enabled");
  }
  
  getRecordingState(): MediaRecorderState {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }
  
  getAudioChunks(): Blob[] {
    return this.audioChunks;
  }
  
  isMicrophoneActive(): boolean {
    return this.microphoneActive;
  }
  
  releaseAllAudioTracks() {
    // Stop and release all audio tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log("[AudioProcessor] Released audio track:", track.label);
        } catch (e) {
          console.warn("[AudioProcessor] Error stopping audio track:", e);
        }
      });
      this.audioStream = null;
    }
  }
  
  cleanup() {
    console.log("[AudioProcessor] Starting complete cleanup");
    
    // Stop and cleanup all media recorder resources
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
        console.log("[AudioProcessor] Media recorder stopped");
      } catch (e) {
        console.warn("[AudioProcessor] Error stopping media recorder:", e);
      }
      this.mediaRecorder = null;
    }

    // Stop and release all audio tracks
    this.releaseAllAudioTracks();
    
    // Clean up silence detector
    if (this.silenceDetector) {
      this.silenceDetector.cleanup();
      this.silenceDetector = null;
    }
    
    // Clean up activity monitor
    if (this.activityMonitor) {
      this.activityMonitor.cleanup();
      this.activityMonitor = null;
    }
    
    this.audioChunks = [];
    this.microphoneActive = false;
    
    // Send the stop activity signal to ensure UI is updated
    this.activityCallback('stop');
    console.log("[AudioProcessor] Cleanup completed");
    
    // Double-check browser microphone status
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log("[AudioProcessor] Available audio inputs after cleanup:", audioInputs.length);
      })
      .catch(err => {
        console.error("[AudioProcessor] Error checking audio devices:", err);
      });
  }
}
