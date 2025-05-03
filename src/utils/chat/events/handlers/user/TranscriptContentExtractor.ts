
/**
 * Component responsible for extracting transcript content from events
 */
import { TextPropertyFinder } from './TextPropertyFinder';

export class TranscriptContentExtractor {
  private textPropertyFinder: TextPropertyFinder;
  private debugEnabled: boolean;
  private extractionCount: number = 0;
  
  constructor(debugEnabled: boolean = true) {
    this.textPropertyFinder = new TextPropertyFinder();
    this.debugEnabled = debugEnabled;
    console.log('[TranscriptContentExtractor] Initialized with debug mode:', debugEnabled);
  }
  
  /**
   * Extract transcript content from different event types
   */
  extractContent(event: any): string | null {
    this.extractionCount++;
    const extractionId = this.extractionCount;
    let transcriptContent: string | null = null;
    let isDelta = false;
    let extractionPath = 'unknown';
    
    // Extract content based on event type
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      extractionPath = 'direct-transcript';
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Direct transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath
        });
      }
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
      extractionPath = 'final-transcript-text';
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Final transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath
        });
      }
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
      extractionPath = 'final-delta-text';
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Final delta transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath
        });
      }
    }
    else if (event.type === 'response.audio_transcript.delta') {
      isDelta = true;
      transcriptContent = this.handleDeltaEvent(event, extractionId);
      extractionPath = 'delta';
    }
    
    // Record extraction metrics
    console.log(`[TranscriptExtractor] #${extractionId} Content extraction result:`, {
      eventType: event.type,
      extractionPath,
      foundContent: !!transcriptContent,
      contentLength: transcriptContent?.length ?? 0,
      isDelta,
      timestamp: new Date().toISOString()
    });
    
    return transcriptContent;
  }
  
  /**
   * Handle delta events specifically
   */
  private handleDeltaEvent(event: any, extractionId: number): string | null {
    let deltaText = null;
    let propertyPath = 'not-found';
    
    // Log complete delta structure for debugging
    if (this.debugEnabled) {
      console.log(`[TranscriptExtractor] #${extractionId} Delta event structure:`, JSON.stringify(event, null, 2));
    }
    
    // Check multiple possible paths for text content
    if (event.delta?.text) {
      deltaText = event.delta.text;
      propertyPath = 'delta.text';
      console.log(`[TranscriptExtractor] #${extractionId} Found text in delta.text: "${deltaText}"`, {
        path: propertyPath,
        length: deltaText.length,
        timestamp: new Date().toISOString()
      });
    } 
    else if (event.text) {
      deltaText = event.text;
      propertyPath = 'event.text';
      console.log(`[TranscriptExtractor] #${extractionId} Found text directly in event.text: "${deltaText}"`, {
        path: propertyPath,
        length: deltaText.length,
        timestamp: new Date().toISOString()
      });
    }
    else if (event.transcript?.text) {
      deltaText = event.transcript.text;
      propertyPath = 'transcript.text';
      console.log(`[TranscriptExtractor] #${extractionId} Found text in transcript.text: "${deltaText}"`, {
        path: propertyPath,
        length: deltaText.length,
        timestamp: new Date().toISOString()
      });
    }
    else if (event.content?.text) {
      deltaText = event.content.text;
      propertyPath = 'content.text';
      console.log(`[TranscriptExtractor] #${extractionId} Found text in content.text: "${deltaText}"`, {
        path: propertyPath,
        length: deltaText.length,
        timestamp: new Date().toISOString()
      });
    }
    else if (typeof event.transcript === 'string') {
      deltaText = event.transcript;
      propertyPath = 'transcript-string';
      console.log(`[TranscriptExtractor] #${extractionId} Found text in transcript string: "${deltaText}"`, {
        path: propertyPath,
        length: deltaText.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // If no text was found in common places, try to extract from the raw event
    if (!deltaText) {
      // Log warning about no text found in expected places
      console.warn(`[TranscriptExtractor] #${extractionId} ⚠️ No text found in expected delta properties, checking full event`);
      
      // Last resort - try to find any text property by traversing the object
      const textProperty = this.textPropertyFinder.findTextProperty(event);
      if (textProperty) {
        deltaText = textProperty;
        propertyPath = 'deep-search';
        console.log(`[TranscriptExtractor] #${extractionId} Found text through deep search: "${deltaText}"`, {
          path: propertyPath,
          length: deltaText.length,
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`[TranscriptExtractor] #${extractionId} ⚠️ No text content found anywhere in delta event`);
      }
    }
    
    return deltaText;
  }
}
