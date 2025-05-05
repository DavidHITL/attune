
import { useCallback } from 'react';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

/**
 * Hook for distributing chat events to appropriate handlers based on event type
 */
export const useChatEventDistributor = () => {
  /**
   * Determines the appropriate handler for each event type
   */
  const distributeEvent = useCallback((event: any) => {
    // Skip processing if no type
    if (!event || !event.type) {
      console.log('[EventDistributor] Received event with no type, skipping');
      return;
    }
    
    // Skip audio buffer events from detailed logging to reduce console noise
    if (event.type !== 'input_audio_buffer.append') {
      // Determine role from event type
      const role = EventTypeRegistry.getRoleForEvent(event.type);
      console.log(`[EventDistributor] Routing event: ${event.type}, role=${role || 'unknown'}`);
    }
    
    // Special handling for specific event types
    if (event.type === 'session.created') {
      console.log('[EventDistributor] Detected session.created event');
    }
    else if (event.type === 'conversation.item.created') {
      handleConversationItem(event);
    }
  }, []);
  
  /**
   * Handle conversation items with more detailed logging
   */
  const handleConversationItem = (event: any) => {
    // Extract role from the event
    const role = event.item?.role;
    
    // Skip if no valid role
    if (role !== 'user' && role !== 'assistant') {
      console.warn(`[EventDistributor] Invalid role in conversation.item: ${role || 'undefined'}`);
      return;
    }
    
    console.log(`[EventDistributor] Processing conversation item with role: ${role}`);
    
    // Extract content based on role
    const content = event.item?.content;
    if (content) {
      const preview = typeof content === 'string' ? content.substring(0, 30) : '(complex content)';
      console.log(`[EventDistributor] Content preview: "${preview}${preview.length >= 30 ? '...' : ''}"`);
    }
  };
  
  return {
    distributeEvent
  };
};
