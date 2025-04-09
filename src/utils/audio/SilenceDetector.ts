
export class SilenceDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private processorNode: AudioWorkletNode | null = null;
  private silenceCallback: (() => void) | null = null;
  
  constructor(private audioStream: MediaStream) {}
  
  async initialize() {
    try {
      this.audioContext = new AudioContext();
      await this.audioContext.audioWorklet.addModule('/silence-detect.js');
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      this.microphone = this.audioContext.createMediaStreamSource(this.audioStream);
      this.processorNode = new AudioWorkletNode(this.audioContext, 'silence-detect');
      
      this.microphone.connect(this.analyser);
      this.analyser.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
      
      this.setupSilenceDetection();
      
      console.log("SilenceDetector initialized successfully");
    } catch (error) {
      console.error("Error initializing SilenceDetector:", error);
      throw error;
    }
  }
  
  onSilenceDetected(callback: () => void) {
    this.silenceCallback = callback;
  }
  
  private setupSilenceDetection() {
    if (!this.processorNode) {
      console.error("ProcessorNode is not initialized");
      return;
    }
    
    this.processorNode.port.onmessage = (event) => {
      if (event.data.silenceDetected && this.silenceCallback) {
        console.log("Silence detected, triggering callback");
        this.silenceCallback();
      }
    };
  }
  
  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.microphone = null;
    this.processorNode = null;
    this.silenceCallback = null;
    
    console.log("SilenceDetector resources cleaned up");
  }
}
