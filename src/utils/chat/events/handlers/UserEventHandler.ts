
/**
 * Handler specifically for user transcript events
 */
import { MessageQueue } from '../../messageQueue';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { UserEventProcessor } from './user/UserEventProcessor';

export class UserEventHandler {
  private userEventProcessor: UserEventProcessor;
  
  constructor(private messageQueue: MessageQueue) {
    this.userEventProcessor = new UserEventProcessor(messageQueue);
    console.log('[UserEventHandler] Initialized');
  }
  
  /**
   * Handle incoming user events
   */
  handleEvent(event: any): void {
    this.userEventProcessor.processEvent(event);
  }
  
  /**
   * Flush accumulated transcript even if time threshold hasn't been met
   * Enhanced to ensure any pending content is always saved
   */
  flushAccumulatedTranscript(): void {
    console.log('[UserEventHandler] Force flushing accumulated transcript');
    this.userEventProcessor.flushAccumulatedTranscript();
  }
}
