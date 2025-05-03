
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
      const role = event.explicitRole || EventTypeRegistry.getRoleForEvent(event.type);
      
      // We should only be handling user events, log an error if not
      if (role !== 'user') {
        console.error(`[UserEventHandler] Received event with incorrect role: ${role}, type: ${event.type}`);
        // Force correct role
        event.explicitRole = 'user';
      }
      
      // Log the role we're processing for debugging
      console.log(`[UserEventHandler] Processing event with type ${event.type} and role ${role || 'unknown'}`);
      
      // Process the event (role validation happens in UserEventProcessor)
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
