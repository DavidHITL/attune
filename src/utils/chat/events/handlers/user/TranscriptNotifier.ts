
/**
 * Component responsible for providing user feedback on transcript detection
 */
import { toast } from 'sonner';

export class TranscriptNotifier {
  private lastNotification: number = 0;
  private notificationThrottleMs: number = 2000; // Don't show notifications more often than this
  private lastContent: string = '';
  
  constructor() {
    console.log('[TranscriptNotifier] Initialized');
  }
  
  /**
   * Show a notification for transcript detection
   */
  notifyTranscriptDetection(transcriptContent: string): void {
    const now = Date.now();
    const timeSinceLastNotification = now - this.lastNotification;
    
    // Don't show notifications too frequently and make sure content is different
    if (timeSinceLastNotification > this.notificationThrottleMs && 
        this.lastContent !== transcriptContent) {
      
      // Show a toast notification
      toast.success("Speech detected", {
        description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
        duration: 2000
      });
      
      // Update state
      this.lastNotification = now;
      this.lastContent = transcriptContent;
      
      console.log(`[TranscriptNotifier] Showed notification for transcript: "${transcriptContent.substring(0, 30)}..."`);
    }
  }
  
  /**
   * Show an error notification
   */
  notifyError(message: string): void {
    toast.error("Error", {
      description: message,
      duration: 3000
    });
    
    console.error(`[TranscriptNotifier] Error notification: ${message}`);
  }
}
