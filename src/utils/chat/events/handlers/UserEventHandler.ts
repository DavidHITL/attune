
/**
 * Handler specifically for user transcript events
 */
import { MessageQueue } from '../../messageQueue';
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
    // Validate that we're handling the right event type
    if (event && event.type) {
      // CRITICAL FIX: Always force 'user' role in UserEventHandler
      // First check if we have an explicit role from dispatcher
      const explicitRole = event.explicitRole;
      
      // We should only be handling user events, log an error if not
      if (explicitRole && explicitRole !== 'user') {
        console.error(`[UserEventHandler] Received event with incorrect explicit role: ${explicitRole}`);
        console.error(`[UserEventHandler] Event type: ${event.type}`);
        return; // Don't process events with mismatched roles - critical protection
      }
      
      // Always force correct role in user event handler
      event.explicitRole = 'user';
      
      // Add more debug logging
      console.log(`[UserEventHandler] Processing event type: ${event.type} with forced USER role`);
      
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
