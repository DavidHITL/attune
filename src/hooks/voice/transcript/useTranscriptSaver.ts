
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

// Create a singleton MessageQueue instance or factory to ensure it's accessible anywhere
let globalMessageQueue: any = null;

// Function to set the global message queue (called from main app initialization)
export const setGlobalMessageQueue = (queue: any) => {
  globalMessageQueue = queue;
  console.log('[TranscriptSaver] Global message queue has been set');
};

export const useTranscriptSaver = () => {
  const { validateConversationContext } = useConversationValidator();
  const { notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError } = useTranscriptNotifications();

  const saveTranscript = useCallback(async (
    transcript: string, 
    role: 'user' | 'assistant',
    saveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | undefined>
  ) => {
    // CRITICAL FIX #1: Force early validation at the entry point
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[TranscriptSaver] FATAL ERROR: Invalid role "${role}"`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }

    // Double-check role format before proceeding
    console.log(`[TranscriptSaver] ⚠️ ROLE CHECKPOINT: role="${role}" (type=${typeof role})`);

    // Add validation of conversation context
    if (!validateConversationContext()) {
      console.error("❌ Cannot save transcript: Invalid conversation context");
      
      // Queue user transcripts, but wait for proper initialization
      if (role === 'user' && globalMessageQueue) {
        console.log('⏱️ [TranscriptSaver] Queueing user transcript until conversation is initialized');
        
        // Add to queue but don't process yet
        globalMessageQueue.queueMessage(role, transcript, false);
        
        toast.info("Your message has been received and will be saved when ready", {
          duration: 3000
        });
        
        return undefined;
      }
      
      return undefined;
    }

    // Validate transcript content
    if (!transcript || transcript.trim() === '') {
      console.warn("⚠️ Empty transcript received, not saving");
      return;
    }
    
    console.log(`🔍 [TranscriptSaver] Role validation passed - role="${role}"`);
    console.log(`💾 [TranscriptSaver] TRANSCRIPT TO SAVE (ROLE=${role.toUpperCase()}):`, transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''));
    
    notifyTranscriptReceived(transcript);
    
    try {
      // UNIFIED PATH: Check if we have access to the global message queue
      if (globalMessageQueue) {
        console.log(`[TranscriptSaver] Using message queue to save ${role} transcript`);
        
        // Queue the message with high priority to ensure it gets processed
        globalMessageQueue.queueMessage(role, transcript, true);
        
        // For UI feedback only - actual saving is handled by the queue
        toast.success(`${role === 'user' ? 'Message' : 'Response'} queued for saving`, {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
          duration: 2000,
        });
        
        // We don't have an immediate ID since the queue will handle saving asynchronously
        notifyTranscriptSaved("queued-" + Date.now());
        
        return {
          id: `temp-${Date.now()}`,
          role: role,
          content: transcript,
          created_at: new Date().toISOString()
        } as Message;
      } else {
        // Use the central message save service
        console.log(`[TranscriptSaver] Using central message save service for ${role} transcript`);
        
        const savedMessage = await messageSaveService.saveMessageToDatabase({
          role: role,
          content: transcript
        });
        
        if (savedMessage) {
          console.log(`✅ [TranscriptSaver] Message saved successfully with ID=${savedMessage.id}, FINAL ROLE="${savedMessage.role}"`);
          
          if (savedMessage.role !== role) {
            console.error(`❌ [TranscriptSaver] ROLE MISMATCH: Expected="${role}", Actual="${savedMessage.role}"`);
            toast.error(`Role mismatch detected: Expected=${role}, Actual=${savedMessage.role}`, {
              duration: 5000
            });
          }
          
          notifyTranscriptSaved(savedMessage.id);
          
          toast.success(`${role === 'user' ? 'Message' : 'Response'} saved`, {
            description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
            duration: 2000,
          });
          
          return savedMessage;
        }
      }
      
      return undefined;
    } catch (error) {
      console.error(`❌ [TranscriptSaver] Failed to save ${role} transcript:`, error);
      notifyTranscriptError(error);
      
      toast.error(`Failed to save ${role === 'user' ? 'message' : 'response'}`, {
        description: "Please try again",
        duration: 3000,
      });
      
      return undefined;
    }
  }, [validateConversationContext, notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError]);

  return { saveTranscript };
};
