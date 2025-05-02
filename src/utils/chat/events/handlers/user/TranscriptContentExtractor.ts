
/**
 * Component responsible for extracting transcript content from events
 */
import { TextPropertyFinder } from './TextPropertyFinder';

export class TranscriptContentExtractor {
  private textPropertyFinder: TextPropertyFinder;
  private debugEnabled: boolean;
  
  constructor(debugEnabled: boolean = true) {
    this.textPropertyFinder = new TextPropertyFinder();
    this.debugEnabled = debugEnabled;
  }
  
  /**
   * Extract transcript content from different event types
   */
  extractContent(event: any): { content: string | null, isDelta: boolean } {
    let transcriptContent: string | null = null;
    let isDelta = false;
    
    // Extract content based on event type
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] Direct transcript: "${transcriptContent?.substring(0, 50)}..."`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString()
        });
      }
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] Final transcript: "${transcriptContent?.substring(0, 50)}..."`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString()
        });
      }
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] Final delta transcript: "${transcriptContent?.substring(0, 50)}..."`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString()
        });
      }
    }
    else if (event.type === 'response.audio_transcript.delta') {
      isDelta = true;
      transcriptContent = this.handleDeltaEvent(event);
    }
    
    return { content: transcriptContent, isDelta };
  }
  
  /**
   * Handle delta events specifically
   */
  private handleDeltaEvent(event: any): string | null {
    let deltaText = null;
    
    // Log complete delta structure for debugging
    if (this.debugEnabled) {
      console.log('[TranscriptExtractor] Delta event structure:', JSON.stringify(event, null, 2));
    }
    
    // Check multiple possible paths for text content
    if (event.delta?.text) {
      deltaText = event.delta.text;
      console.log(`[TranscriptExtractor] Found text in delta.text: "${deltaText}"`);
    } 
    else if (event.text) {
      deltaText = event.text;
      console.log(`[TranscriptExtractor] Found text directly in event.text: "${deltaText}"`);
    }
    else if (event.transcript?.text) {
      deltaText = event.transcript.text;
      console.log(`[TranscriptExtractor] Found text in transcript.text: "${deltaText}"`);
    }
    else if (event.content?.text) {
      deltaText = event.content.text;
      console.log(`[TranscriptExtractor] Found text in content.text: "${deltaText}"`);
    }
    else if (typeof event.transcript === 'string') {
      deltaText = event.transcript;
      console.log(`[TranscriptExtractor] Found text in transcript string: "${deltaText}"`);
    }
    
    // If no text was found in common places, try to extract from the raw event
    if (!deltaText) {
      // Log warning about no text found in expected places
      console.warn('[TranscriptExtractor] ⚠️ No text found in expected delta properties, checking full event');
      
      // Last resort - try to find any text property by traversing the object
      const textProperty = this.textPropertyFinder.findTextProperty(event);
      if (textProperty) {
        deltaText = textProperty;
        console.log(`[TranscriptExtractor] Found text through deep search: "${deltaText}"`);
      } else {
        console.warn('[TranscriptExtractor] ⚠️ No text content found anywhere in delta event');
      }
    }
    
    return deltaText;
  }
}
