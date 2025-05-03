
/**
 * Component responsible for processing user events
 */
import { MessageQueue } from '../../../messageQueue';
import { TextPropertyFinder } from './TextPropertyFinder';
import { TranscriptProcessor } from './TranscriptProcessor';
import { TranscriptContentExtractor } from './TranscriptContentExtractor';
import { UserEventDebugger } from './UserEventDebugger';
import { EventTypeRegistry } from '../../EventTypeRegistry';

export class UserEventProcessor {
  private textPropertyFinder: TextPropertyFinder;
  private transcriptProcessor: TranscriptProcessor;
  private transcriptContentExtractor: TranscriptContentExtractor;
  private eventDebugger: UserEventDebugger;
  private processedCount: number = 0;
  
  constructor(private messageQueue: MessageQueue) {
    this.textPropertyFinder = new TextPropertyFinder();
    this.transcriptProcessor = new TranscriptProcessor(messageQueue);
    this.transcriptContentExtractor = new TranscriptContentExtractor();
    this.eventDebugger = UserEventDebugger.getInstance();
    
    console.log('[UserEventProcessor] Initialized');
  }
  
  /**
   * Process user events and extract transcript content
   */
  processEvent(event: any): void {
    this.processedCount++;
    const processId = this.processedCount;
    
    // Get the correct role from the event type
    const role = event.explicitRole || EventTypeRegistry.getRoleForEvent(event.type);
    
    // Log incoming event for debugging
    console.log(`[UserEventProcessor] #${processId} Processing event: ${event.type}, determined role: ${role || 'unknown'}`);
    
    try {
      // Debug the event structure before extraction
      this.eventDebugger.analyzeEvent(event);
      
      // Extract content from the event using content extractor
      const content = this.transcriptContentExtractor.extractContent(event);
      
      // If no content found, try deeper search
      if (!content) {
        console.log(`[UserEventProcessor] #${processId} No content found in initial extraction, attempting deep search...`);
        const deepText = this.textPropertyFinder.findTextProperty(event);
        
        if (deepText) {
          console.log(`[UserEventProcessor] #${processId} Deep search found text content: "${deepText.substring(0, 30)}${deepText.length > 30 ? '...' : ''}" with role: ${role || 'unknown'}`);
          
          // Only process if we have a valid role (assistant or user)
          if (role === 'user' || role === 'assistant') {
            this.transcriptProcessor.saveMessage(deepText, role, true);
          } else {
            console.warn(`[UserEventProcessor] #${processId} Skipping message with invalid role: ${role}`);
          }
        } else {
          console.log(`[UserEventProcessor] #${processId} No text content found in event:`, 
            event.type, event.explicitRole || '(no explicit role)');
        }
      } else {
        // Process the extracted content with the correct role
        console.log(`[UserEventProcessor] #${processId} Extracted content: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}" with role: ${role || 'unknown'}`);
        
        // Only process if we have a valid role (assistant or user)
        if (role === 'user' || role === 'assistant') {
          this.transcriptProcessor.saveMessage(content, role, true);
        } else {
          console.warn(`[UserEventProcessor] #${processId} Skipping message with invalid role: ${role}`);
        }
      }
    } catch (error) {
      console.error(`[UserEventProcessor] #${processId} Error processing event:`, error);
    }
  }
  
  /**
   * Flush any accumulated transcript before disconnection
   */
  flushAccumulatedTranscript(): void {
    console.log('[UserEventProcessor] Flushing any accumulated transcript');
    // Implementation specific to your transcript accumulation logic
  }
}
