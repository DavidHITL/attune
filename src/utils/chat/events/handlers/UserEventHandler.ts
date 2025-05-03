
/**
 * Handler specifically for user transcript events
 */
import { MessageQueue } from '../../messageQueue';
import { UserEventProcessor } from './user/UserEventProcessor';

export class UserEventHandler {
  private userEventProcessor: UserEventProcessor;
  
  constructor(private messageQueue: MessageQueue) {
    this.userEventProcessor = new UserEventProcessor(messageQueue);
  }
  
  /**
   * Handle incoming user events
   */
  handleEvent(event: any): void {
    // Validate that we're handling the right event type
    if (event && event.type) {
      // CRITICAL FIX: Always force 'user' role in UserEventHandler
      // First check if we have an explicit role from dispatcher
      const explicitRole = event.explicitRole;
      
      // We should only be handling user events, log an error if not
      if (explicitRole && explicitRole !== 'user') {
        console.error(`Received event with incorrect explicit role: ${explicitRole}`);
      }
      
      // Always force correct role in user event handler
      event.explicitRole = 'user';
      
      // Process the event with forced 'user' role
      this.userEventProcessor.processEvent(event);
    }
  }
  
  /**
   * Flush accumulated transcript even if time threshold hasn't been met
   */
  flushAccumulatedTranscript(): void {
    this.userEventProcessor.flushAccumulatedTranscript();
  }
}
