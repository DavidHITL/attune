
/**
 * Component responsible for user feedback notifications
 */
import { toast } from 'sonner';

export class TranscriptNotifier {
  /**
   * Show toast notification for transcript detection
   */
  notifyTranscriptDetection(transcriptContent: string): void {
    toast.success("Speech detected", { 
      description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
      duration: 2000
    });
  }
}
