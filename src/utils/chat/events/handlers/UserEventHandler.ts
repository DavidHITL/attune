
/**
 * Handler specifically for user transcript events
 */
import { MessageQueue } from '../../messageQueue';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { toast } from 'sonner';

export class UserEventHandler {
  private lastTranscriptContent: string = '';
  private accumulatedDeltaContent: string = '';
  private lastProcessedTimestamp: number = 0;
  private debugEnabled: boolean = true;
  
  // UPDATED: Much more aggressive timing threshold (300ms instead of 1000ms)
  private saveThresholdMs: number = 300;
  
  constructor(private messageQueue: MessageQueue) {
    console.log('[UserEventHandler] Initialized');
  }
  
  handleEvent(event: any): void {
    if (this.debugEnabled) {
      console.log(`[UserEventHandler] Processing event type: ${event.type}`);
    }
    
    // Verify this is actually a user event
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[UserEventHandler] Event ${event.type} is not a user event, skipping`);
      return;
    }
    
    // Always force the correct role for any messages saved here
    const forcedRole = 'user';
    
    let transcriptContent: string | null = null;
    let isDelta = false;
    
    // Extract content based on event type
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      console.log(`[UserEventHandler] Direct transcript: "${transcriptContent.substring(0, 50)}..."`, {
        length: transcriptContent.length,
        timestamp: new Date().toISOString(),
        forcedRole: forcedRole
      });
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
      console.log(`[UserEventHandler] Final transcript: "${transcriptContent.substring(0, 50)}..."`, {
        length: transcriptContent.length,
        timestamp: new Date().toISOString(),
        forcedRole: forcedRole
      });
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
      console.log(`[UserEventHandler] Final delta transcript: "${transcriptContent.substring(0, 50)}..."`, {
        length: transcriptContent.length,
        timestamp: new Date().toISOString(),
        forcedRole: forcedRole
      });
    }
    else if (event.type === 'response.audio_transcript.delta') {
      // IMPROVED DELTA HANDLING: Check multiple properties where text might be found
      let deltaText = null;
      
      // Log complete delta structure for debugging
      if (this.debugEnabled) {
        console.log('[UserEventHandler] Delta event structure:', JSON.stringify(event, null, 2));
      }
      
      // Check multiple possible paths for text content
      if (event.delta?.text) {
        deltaText = event.delta.text;
        console.log(`[UserEventHandler] Found text in delta.text: "${deltaText}"`);
      } 
      else if (event.text) {
        deltaText = event.text;
        console.log(`[UserEventHandler] Found text directly in event.text: "${deltaText}"`);
      }
      else if (event.transcript?.text) {
        deltaText = event.transcript.text;
        console.log(`[UserEventHandler] Found text in transcript.text: "${deltaText}"`);
      }
      else if (event.content?.text) {
        deltaText = event.content.text;
        console.log(`[UserEventHandler] Found text in content.text: "${deltaText}"`);
      }
      else if (typeof event.transcript === 'string') {
        deltaText = event.transcript;
        console.log(`[UserEventHandler] Found text in transcript string: "${deltaText}"`);
      }
      
      // If no text was found in common places, try to extract from the raw event
      if (!deltaText) {
        // Log warning about no text found in expected places
        console.warn('[UserEventHandler] ⚠️ No text found in expected delta properties, checking full event');
        
        // Last resort - try to find any text property by traversing the object
        const textProperty = this.findTextProperty(event);
        if (textProperty) {
          deltaText = textProperty;
          console.log(`[UserEventHandler] Found text through deep search: "${deltaText}"`);
        } else {
          console.warn('[UserEventHandler] ⚠️ No text content found anywhere in delta event');
        }
      }
      
      // Only continue if we found text content
      if (deltaText) {
        this.accumulatedDeltaContent += deltaText;
        isDelta = true;
        console.log(`[UserEventHandler] Accumulating delta: "${deltaText}" (total: ${this.accumulatedDeltaContent.length} chars)`);
        
        // IMPROVED: Much more aggressive processing of accumulated deltas - reduced time threshold
        const now = Date.now();
        if (now - this.lastProcessedTimestamp > this.saveThresholdMs && this.accumulatedDeltaContent.trim() !== '') {
          transcriptContent = this.accumulatedDeltaContent;
          this.lastProcessedTimestamp = now;
          console.log(`[UserEventHandler] Processing accumulated deltas after ${this.saveThresholdMs}ms: "${transcriptContent.substring(0, 50)}..."`);
          
          // ADDED: Save after each 300ms of accumulated content
          this.saveUserMessage(transcriptContent, forcedRole);
          return;
        } else {
          // Wait for more deltas or the "done" event
          // ADDED: Even if under threshold, save if accumulated text is substantial
          if (this.accumulatedDeltaContent.length > 20 && this.accumulatedDeltaContent.includes(" ")) {
            transcriptContent = this.accumulatedDeltaContent;
            this.lastProcessedTimestamp = now;
            console.log(`[UserEventHandler] Processing lengthy accumulated deltas: "${transcriptContent.substring(0, 50)}..."`);
            
            this.saveUserMessage(transcriptContent, forcedRole);
            return;
          }
          
          return;
        }
      } else {
        console.warn('[UserEventHandler] Empty transcript in delta event, skipping');
        return;
      }
    }
    
    // Skip empty transcripts
    if (!transcriptContent || transcriptContent.trim() === '') {
      console.log(`[UserEventHandler] Empty transcript in ${event.type}, skipping`);
      return;
    }
    
    // IMPROVED: Allow more similar content (only skip if 100% identical)
    if (this.lastTranscriptContent === transcriptContent) {
      console.log(`[UserEventHandler] Duplicate transcript, skipping`);
      return;
    }
    
    this.saveUserMessage(transcriptContent, forcedRole);
  }
  
  /**
   * Save a user message to the queue
   */
  private saveUserMessage(transcriptContent: string, forcedRole: string): void {
    this.lastTranscriptContent = transcriptContent;
    
    console.log(`[UserEventHandler] Saving USER transcript: "${transcriptContent.substring(0, 50)}..."`, {
      contentLength: transcriptContent.length,
      timestamp: new Date().toISOString(),
      forcedRole: forcedRole
    });
    
    // Add message to queue with highest priority
    this.messageQueue.queueMessage(forcedRole, transcriptContent, true);
    
    // Show notification for user feedback
    toast.success("Speech detected", { 
      description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
      duration: 2000
    });
  }
  
  /**
   * Helper to find any text property in an object (deep search)
   */
  private findTextProperty(obj: any, depth = 0): string | null {
    // Prevent infinite recursion
    if (depth > 5) return null;
    
    if (!obj || typeof obj !== 'object') return null;
    
    // Direct text properties
    if (typeof obj.text === 'string' && obj.text.trim() !== '') {
      return obj.text;
    }
    
    // Check transcript property
    if (typeof obj.transcript === 'string' && obj.transcript.trim() !== '') {
      return obj.transcript;
    }
    
    // Recursively check nested objects
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const result = this.findTextProperty(obj[key], depth + 1);
          if (result) return result;
        } else if (key.includes('text') && typeof obj[key] === 'string' && obj[key].trim() !== '') {
          return obj[key];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Flush accumulated transcript even if time threshold hasn't been met
   */
  flushAccumulatedTranscript(): void {
    if (this.accumulatedDeltaContent && this.accumulatedDeltaContent.trim() !== '') {
      console.log(`[UserEventHandler] Forcing flush of accumulated transcript: "${this.accumulatedDeltaContent.substring(0, 50)}..."`);
      this.messageQueue.queueMessage('user', this.accumulatedDeltaContent, true);
      this.lastTranscriptContent = this.accumulatedDeltaContent;
      this.accumulatedDeltaContent = '';
    }
  }
}

