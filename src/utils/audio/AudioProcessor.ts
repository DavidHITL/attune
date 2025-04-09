import { MediaRecorderState } from '@/utils/types';

export class AudioProcessor {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private microphoneActive: boolean = false;
  private activityCallback: (state: 'start' | 'stop') => void;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private processorNode: AudioWorkletNode | null = null;
  private silenceDetectionInterval: number | null = null;
  
  constructor(activityCallback: (state: 'start' | 'stop') => void) {
    this.activityCallback = activityCallback;
  }
  
  async initMicrophone(): Promise<MediaStream> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphoneActive = true;
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
    
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule('/silence-detect.js');
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    
    this.microphone = this.audioContext.createMediaStreamSource(this.audioStream);
    this.processorNode = new AudioWorkletNode(this.audioContext, 'silence-detect');
    
    this.microphone.connect(this.analyser);
    this.analyser.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
    
    this.processorNode.port.onmessage = (event) => {
      if (event.data.silenceDetected) {
        this.stopRecording();
      }
    };
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
      console.log("Microphone paused.");
    }
  }
  
  resumeMicrophone() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.enabled = true;
      });
      this.microphoneActive = true;
      console.log("Microphone resumed.");
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
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.stop();
      });
      this.audioStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
    
    if (this.analyser) {
      this.analyser = null;
    }
    
    if (this.microphone) {
      this.microphone = null;
    }
    
    if (this.processorNode) {
      this.processorNode = null;
    }
    
    if (this.silenceDetectionInterval) {
      clearInterval(this.silenceDetectionInterval);
      this.silenceDetectionInterval = null;
    }
    
    this.audioChunks = [];
    this.microphoneActive = false;
    console.log("AudioProcessor cleanup completed.");
  }
}
