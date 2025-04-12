
import { MediaRecorderState } from '@/utils/types';
import { SilenceDetector } from './SilenceDetector';
import { ActivityMonitor } from './ActivityMonitor';
import { BaseAudioProcessor } from './processors/BaseAudioProcessor';
import { RecorderManager } from './processors/RecorderManager';
import { AdvancedMicrophoneControl } from './processors/AdvancedMicrophoneControl';

/**
 * Main audio processing class that coordinates all audio handling features
 */
export class AudioProcessor extends BaseAudioProcessor {
  private recorderManager: RecorderManager;
  private silenceDetector: SilenceDetector | null = null;
  private activityMonitor: ActivityMonitor | null = null;
  private advancedMicControl: AdvancedMicrophoneControl;
  
  constructor(activityCallback: (state: 'start' | 'stop') => void) {
    super();
    this.recorderManager = new RecorderManager(activityCallback);
    this.advancedMicControl = new AdvancedMicrophoneControl();
  }
  
  /**
   * Initialize audio context and associated processors
   */
  async initAudioContext() {
    if (!this.audioStream) {
      throw new Error("Audio stream is not initialized. Call initMicrophone first.");
    }
    
    this.advancedMicControl.setAudioStream(this.audioStream);
    
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
  
  /**
   * Start recording from the current audio stream
   */
  startRecording() {
    if (!this.audioStream) {
      console.error("[AudioProcessor] No audio stream available. Call initMicrophone first.");
      return;
    }
    
    this.recorderManager.startRecording(this.audioStream);
  }
  
  /**
   * Stop the current recording
   */
  stopRecording() {
    this.recorderManager.stopRecording();
  }
  
  /**
   * Force pause microphone with additional muting
   */
  forcePauseMicrophone() {
    this.advancedMicControl.forcePauseMicrophone();
    this.microphoneActive = false;
  }
  
  /**
   * Force resume microphone, reinitializing if necessary
   */
  forceResumeMicrophone() {
    this.advancedMicControl.forceResumeMicrophone().then(stream => {
      if (stream) {
        this.audioStream = stream;
        this.microphoneActive = true;
      }
    });
  }
  
  /**
   * Get current recording state
   */
  getRecordingState(): MediaRecorderState {
    return this.recorderManager.getRecordingState();
  }
  
  /**
   * Get the recorded audio chunks
   */
  getAudioChunks(): Blob[] {
    return this.recorderManager.getAudioChunks();
  }
  
  /**
   * Clean up all resources
   */
  cleanup() {
    console.log("[AudioProcessor] Starting complete cleanup");
    
    // Clean up recorder
    this.recorderManager.cleanup();
    
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
    
    this.microphoneActive = false;
    
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
