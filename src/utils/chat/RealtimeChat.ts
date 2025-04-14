
import { MessageCallback, StatusCallback, SaveMessageCallback } from '../types';
import { RealtimeChatCore } from './core/RealtimeChatCore';

export class RealtimeChat {
  private core: RealtimeChatCore;
  
  constructor(
    messageCallback: MessageCallback,
    statusCallback: StatusCallback,
    saveMessageCallback: SaveMessageCallback
  ) {
    this.core = new RealtimeChatCore(messageCallback, statusCallback, saveMessageCallback);
  }

  // Delegate all methods to the core implementation
  async init() {
    return this.core.init();
  }
  
  pauseMicrophone() {
    this.core.pauseMicrophone();
  }
  
  resumeMicrophone() {
    this.core.resumeMicrophone();
  }
  
  forceStopMicrophone() {
    this.core.forceStopMicrophone();
  }
  
  forceResumeMicrophone() {
    this.core.forceResumeMicrophone();
  }
  
  isMicrophonePaused() {
    return this.core.isMicrophonePaused();
  }
  
  setMuted(muted: boolean) {
    this.core.setMuted(muted);
  }

  // Add missing flushPendingMessages method
  flushPendingMessages() {
    this.core.flushPendingMessages();
  }

  disconnect() {
    this.core.disconnect();
  }
}
