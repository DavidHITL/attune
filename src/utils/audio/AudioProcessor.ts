
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
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphoneActive = true;
      console.log("Microphone initialized successfully");
      return this.audioStream;
    } catch (error) {
      console.error("Error accessing microphone:", error);
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
      console.error("No audio stream available. Call initMicrophone first.");
      return;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      console.warn("MediaRecorder is already recording.");
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
      console.log("Recording stopped.");
    };
    
    this.mediaRecorder.start();
    this.activityCallback('start');
    console.log("Recording started.");
  }
  
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.activityCallback('stop');
      console.log("Stopping recording...");
    } else {
      console.warn("MediaRecorder is not currently recording.");
    }
  }
  
  pauseMicrophone() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.enabled = false;
      });
      this.microphoneActive = false;
      console.log("Microphone paused - tracks disabled");
    }
  }
  
  resumeMicrophone() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.enabled = true;
      });
      this.microphoneActive = true;
      console.log("Microphone resumed - tracks enabled");
    }
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
  
  cleanup() {
    // Stop and cleanup all media recorder resources
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn("Error stopping media recorder:", e);
      }
      this.mediaRecorder = null;
    }

    // Stop and release all audio tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Error stopping audio track:", e);
        }
      });
      this.audioStream = null;
    }
    
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
    console.log("AudioProcessor cleanup completed.");
  }
}
