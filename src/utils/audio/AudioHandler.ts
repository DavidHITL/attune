
export class AudioHandler {
  private audioElement: HTMLAudioElement;
  
  constructor() {
    this.audioElement = new Audio();
    this.audioElement.autoplay = true;
  }
  
  setMuted(muted: boolean): void {
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
  }
  
  setupRemoteAudio(event: RTCTrackEvent): void {
    console.log("Track received:", event);
    this.audioElement.srcObject = event.streams[0];
  }
  
  cleanup(): void {
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
  }
}
