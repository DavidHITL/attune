
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
    // Validate that we're handling the right event type
    if (event && event.type) {
      // CRITICAL FIX: Always force 'user' role in UserEventHandler
      // First check if we have an explicit role from dispatcher
      const explicitRole = event.explicitRole;
      
      // We should only be handling user events, log an error if not
      if (explicitRole && explicitRole !== 'user') {
        console.error(`[UserEventHandler] Received event with incorrect explicit role: ${explicitRole}, type: ${event.type}`);
      }
      
      // CRITICAL FIX: Always force correct role in user event handler
      event.explicitRole = 'user';
      
      // Log the role we're processing for debugging
      console.log(`[UserEventHandler] Processing event with type ${event.type} and FORCED USER role`);
      
      // Process the event with forced 'user' role
      this.userEventProcessor.processEvent(event);
    } else {
      console.warn('[UserEventHandler] Received event with no type, skipping');
    }
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
