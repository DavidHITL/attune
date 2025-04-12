
import { MediaRecorderState } from '@/utils/types';

/**
 * Handles recording functionality for audio processing
 */
export class RecorderManager {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private activityCallback: (state: 'start' | 'stop') => void;
  
  constructor(activityCallback: (state: 'start' | 'stop') => void) {
    this.activityCallback = activityCallback;
  }
  
  /**
   * Start recording from the provided audio stream
   */
  startRecording(audioStream: MediaStream) {
    if (!audioStream) {
      console.error("[RecorderManager] No audio stream available");
      return;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      console.warn("[RecorderManager] MediaRecorder is already recording");
      return;
    }
    
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(audioStream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = () => {
      console.log("[RecorderManager] Recording stopped");
    };
    
    this.mediaRecorder.start();
    this.activityCallback('start');
    console.log("[RecorderManager] Recording started");
  }
  
  /**
   * Stop the current recording
   */
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.activityCallback('stop');
      console.log("[RecorderManager] Stopping recording...");
    } else {
      console.warn("[RecorderManager] MediaRecorder is not currently recording");
    }
  }
  
  /**
   * Get current recording state
   */
  getRecordingState(): MediaRecorderState {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }
  
  /**
   * Get the recorded audio chunks
   */
  getAudioChunks(): Blob[] {
    return this.audioChunks;
  }
  
  /**
   * Clean up recorder resources
   */
  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
        console.log("[RecorderManager] Media recorder stopped");
      } catch (e) {
        console.warn("[RecorderManager] Error stopping media recorder:", e);
      }
      this.mediaRecorder = null;
    }
    
    this.audioChunks = [];
  }
}
