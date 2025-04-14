
import { EventType } from './EventTypes';
import { toast } from 'sonner';

export class TranscriptEventHandler {
  private lastTranscriptContent: string = '';
  
  constructor(
    private saveUserMessage: (text: string) => void
  ) {}
  
  handleTranscriptEvents(event: any): void {
    // Handle direct transcript events
    if (event.type === "transcript" && event.transcript && event.transcript.trim()) {
      if (this.lastTranscriptContent !== event.transcript) {
        this.lastTranscriptContent = event.transcript;
        
        toast.info("Speech detected", { 
          description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
          duration: 2000
        });
        
        this.saveUserMessage(event.transcript);
      }
    }
    
    // Handle final transcript completion
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      if (this.lastTranscriptContent !== finalTranscript && finalTranscript.trim() !== '') {
        this.lastTranscriptContent = finalTranscript;
        
        toast.success("Speech transcribed", { 
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
        
        this.saveUserMessage(finalTranscript);
      }
    }
  }
}
