
import { EventTypeRegistry } from '../events/EventTypeRegistry';
import { toast } from 'sonner';
import { getMessageQueue } from '../messageQueue/QueueProvider';

export class TranscriptHandler {
  private lastTranscriptContent: string = '';
  private processedTranscripts = new Set<string>();
  private accumulatedDelta: string = '';
  private isSpeaking: boolean = false;
  
  constructor(
    private saveUserMessage: (text: string) => void
  ) {}

  // Speech state management
  handleSpeechStarted(): void {
    console.log('[TranscriptHandler] Speech started');
    this.isSpeaking = true;
    this.accumulatedDelta = ''; // Reset accumulated deltas on speech start
  }
  
  handleSpeechStopped(): void {
    console.log('[TranscriptHandler] Speech stopped');
    this.isSpeaking = false;
    
    // Optionally handle any pending deltas when speech stops
    if (this.accumulatedDelta) {
      console.log('[TranscriptHandler] Handling pending deltas from speech stop');
    }
  }
  
  // Transcript delta handling (incremental updates)
  handleTranscriptDelta(deltaText: string): void {
    if (!deltaText) return;
    
    this.accumulatedDelta += deltaText;
    
    // Show toast only for significant delta updates to avoid excessive notifications
    if (deltaText.length > 5) {
      toast.info("Speech detected", { 
        description: this.accumulatedDelta.substring(0, 50) + (this.accumulatedDelta.length > 50 ? "..." : ""),
        duration: 2000
      });
    }
  }
  
  // Handle direct transcript events (immediate, non-final transcripts)
  handleDirectTranscript(transcript: string): void {
    if (!transcript || transcript.trim() === '') return;
    
    console.log(`[TranscriptHandler] Direct transcript: "${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`);
    
    toast.info("Speech detected", { 
      description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
      duration: 2000
    });
    
    // Update last content but don't save yet
    this.lastTranscriptContent = transcript;
  }
  
  // Handle final transcript (committed transcripts)
  handleFinalTranscript(transcript: string): void {
    if (!transcript || transcript.trim() === '') {
      return; // Skip empty transcripts
    }
    
    // Create a fingerprint for deduplication
    const transcriptFingerprint = `final:${transcript.substring(0, 50)}`;
    
    // Skip if we've already processed this exact transcript
    if (this.processedTranscripts.has(transcriptFingerprint)) {
      console.log('[TranscriptHandler] Skipping duplicate final transcript');
      return;
    }
    
    // Mark this transcript as processed
    this.processedTranscripts.add(transcriptFingerprint);
    this.lastTranscriptContent = transcript;
      
    console.log(`[TranscriptHandler] Saving final transcript: "${transcript.substring(0, 50)}..."`);
    
    toast.success("Speech transcribed", { 
      description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
      duration: 2000
    });
    
    // Try to use message queue first, fall back to direct save if not available
    const messageQueue = getMessageQueue();
    if (messageQueue) {
      console.log('[TranscriptHandler] Using message queue to save user transcript');
      messageQueue.queueMessage('user', transcript, true);
    } else {
      console.log('[TranscriptHandler] No message queue available, using direct save');
      // Fall back to direct save method
      this.saveUserMessage(transcript);
    }
  }
  
  // Handle audio buffer committed events
  handleAudioBufferCommitted(): void {
    console.log('[TranscriptHandler] Audio buffer committed');
    // Additional handling if needed
  }
  
  // For handling the original transcript events 
  handleTranscriptEvents(event: any): void {
    // Verify this is a user event to avoid handling assistant events
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[TranscriptHandler] Not a user event: ${event.type}, skipping`);
      return;
    }
    
    // Handle direct transcript events - show feedback but don't save
    if (event.type === "transcript" && event.transcript && event.transcript.trim()) {
      if (this.lastTranscriptContent !== event.transcript) {
        this.lastTranscriptContent = event.transcript;
        
        // Only show toast for interim feedback, don't save messages
        toast.info("Speech detected", { 
          description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
          duration: 2000
        });
      }
      return; // We don't save interim transcripts - only final ones
    }
    
    // Handle conversation.item.input_audio_transcription.completed events - final transcripts from OpenAI
    if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
      const finalTranscript = event.transcript;
      if (finalTranscript.trim() === '') {
        return; // Skip empty transcripts
      }
      
      // Create a fingerprint for deduplication
      const transcriptFingerprint = `${event.type}:${finalTranscript.substring(0, 50)}`;
      
      // Skip if we've already processed this exact transcript
      if (this.processedTranscripts.has(transcriptFingerprint)) {
        console.log('[TranscriptHandler] Skipping duplicate input audio transcription');
        return;
      }
      
      // Mark this transcript as processed
      this.processedTranscripts.add(transcriptFingerprint);
      this.lastTranscriptContent = finalTranscript;
        
      console.log(`[TranscriptHandler] Saving final user transcript from input_audio_transcription: "${finalTranscript.substring(0, 50)}..."`);
      
      toast.success("Speech transcribed", { 
        description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
        duration: 2000
      });
      
      // Try to use message queue first, fall back to direct save if not available
      const messageQueue = getMessageQueue();
      if (messageQueue) {
        console.log('[TranscriptHandler] Using message queue to save user transcript');
        // CRITICAL FIX: Explicitly set role to 'user' since this is a user transcript handler
        messageQueue.queueMessage('user', finalTranscript, true);
      } else {
        console.log('[TranscriptHandler] No message queue available, using direct save');
        // Fall back to direct save method
        this.saveUserMessage(finalTranscript);
      }
      
      return; // We've handled this event
    }
    
    // Handle final transcript completion - this is where we save user transcripts
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      if (finalTranscript.trim() === '') {
        return; // Skip empty transcripts
      }
      
      // Create a fingerprint for deduplication
      const transcriptFingerprint = `${event.type}:${finalTranscript.substring(0, 50)}`;
      
      // Skip if we've already processed this exact transcript
      if (this.processedTranscripts.has(transcriptFingerprint)) {
        console.log('[TranscriptHandler] Skipping duplicate transcript');
        return;
      }
      
      // Mark this transcript as processed
      this.processedTranscripts.add(transcriptFingerprint);
      this.lastTranscriptContent = finalTranscript;
        
      console.log(`[TranscriptHandler] Saving final user transcript: "${finalTranscript.substring(0, 50)}..."`);
      
      toast.success("Speech transcribed", { 
        description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
        duration: 2000
      });
      
      // Try to use message queue first, fall back to direct save if not available
      const messageQueue = getMessageQueue();
      if (messageQueue) {
        console.log('[TranscriptHandler] Using message queue to save user transcript');
        // CRITICAL FIX: Explicitly set role to 'user' since this is a user transcript handler
        messageQueue.queueMessage('user', finalTranscript, true);
      } else {
        console.log('[TranscriptHandler] No message queue available, using direct save');
        // Fall back to direct save method
        this.saveUserMessage(finalTranscript);
      }
    }
  }
  
  // Helper method to flush any pending transcript
  flushPendingTranscript(): void {
    if (this.accumulatedDelta) {
      console.log('[TranscriptHandler] Flushing pending transcript');
      this.handleFinalTranscript(this.accumulatedDelta);
      this.accumulatedDelta = '';
    }
  }
  
  // Clear processed transcripts (for testing or session resets)
  clearProcessedTranscripts() {
    this.processedTranscripts.clear();
  }
}

