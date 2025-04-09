
export class ActivityMonitor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private monitoringInterval: number | null = null;
  private lastActiveTime: number = 0;
  private activityThreshold = 0.05;
  
  constructor(private audioStream: MediaStream) {
    this.setupActivity();
  }
  
  private setupActivity() {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      this.microphone = this.audioContext.createMediaStreamSource(this.audioStream);
      this.microphone.connect(this.analyser);
      
      console.log("ActivityMonitor initialized successfully");
    } catch (error) {
      console.error("Error setting up ActivityMonitor:", error);
    }
  }
  
  startMonitoring(onActivity: () => void, inactivityThresholdMs = 2000) {
    if (!this.analyser) {
      console.error("Analyser not initialized");
      return;
    }
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    this.monitoringInterval = window.setInterval(() => {
      this.analyser!.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength / 255;
      
      // Detect activity
      if (average > this.activityThreshold) {
        this.lastActiveTime = Date.now();
        onActivity();
      } else if (Date.now() - this.lastActiveTime > inactivityThresholdMs) {
        // Do something on inactivity if needed
      }
    }, 100);
  }
  
  stopMonitoring() {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  cleanup() {
    this.stopMonitoring();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.microphone = null;
    
    console.log("ActivityMonitor resources cleaned up");
  }
}
