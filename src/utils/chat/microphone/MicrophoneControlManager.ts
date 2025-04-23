
import { ConnectionManager } from '../ConnectionManager';

export class MicrophoneControlManager {
  constructor(private connectionManager: ConnectionManager | null) {}

  pauseMicrophone(): void {
    this.connectionManager?.pauseMicrophone();
  }

  resumeMicrophone(): void {
    this.connectionManager?.resumeMicrophone();
  }

  forceStopMicrophone(): void {
    this.connectionManager?.completelyStopMicrophone();
  }

  forceResumeMicrophone(): void {
    this.connectionManager?.forceResumeMicrophone();
  }

  setMuted(muted: boolean): void {
    this.connectionManager?.setMuted(muted);
  }

  isMicrophonePaused(): boolean {
    return this.connectionManager?.audioProcessor.isMicrophonePaused() || false;
  }
}
