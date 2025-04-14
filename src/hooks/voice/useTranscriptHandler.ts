
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useConversation } from '@/hooks/useConversation';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook for handling transcript events with enhanced debugging
 */
export const useTranscriptHandler = () => {
  const { saveMessage, conversationId } = useConversation();
  const { user } = useAuth();

  const handleTranscriptEvent = useCallback((event: any, saveUserMessage: (content: string) => void) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasUser: !!user,
      hasConversationId: !!conversationId,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced validation logging
    if (!user || !conversationId) {
      console.warn('🚫 Missing required context:', {
        user: !!user ? 'present' : 'missing',
        conversationId: !!conversationId ? conversationId : 'missing',
        eventType: event.type
      });
    }
    
    // Handle transcript events for user messages with detailed logging
    if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      console.log("📝 Processing direct transcript event:", {
        timestamp: new Date().toISOString(),
        contentPreview: event.transcript.substring(0, 50),
        conversationId,
        userId: user?.id
      });
      
      // Show toast confirmation for transcript received
      toast.info("User speech detected", {
        description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
        duration: 2000,
      });
      
      if (!user) {
        console.warn("⚠️ Can't save message: No authenticated user");
        toast.error("Sign in to save your messages");
        return;
      }
      
      if (!conversationId) {
        console.warn("⚠️ Can't save message: No conversation ID");
        toast.error("No active conversation");
        return;
      }
      
      // Explicitly save through conversation context with enhanced logging
      try {
        console.log("💾 Initiating save via conversation context:", {
          preview: event.transcript.substring(0, 30),
          conversationId,
          timestamp: new Date().toISOString()
        });
        
        saveMessage({
          role: 'user',
          content: event.transcript
        }).then(savedMsg => {
          console.log("✅ Successfully saved user transcript:", {
            messageId: savedMsg?.id,
            timestamp: new Date().toISOString()
          });
        }).catch(err => {
          console.error("❌ Failed to save user transcript:", {
            error: err,
            timestamp: new Date().toISOString()
          });
        });
      } catch (error) {
        console.error("💥 Error in save attempt:", {
          error,
          timestamp: new Date().toISOString()
        });
      }
      
      // Also use the direct save method as a fallback
      if (saveUserMessage) {
        console.log("📎 Using fallback direct save method");
        saveUserMessage(event.transcript);
      }
      
      // Log key information about conversation state
      console.log("🔄 Current conversation state:", {
        conversationId,
        hasUser: !!user,
        timestamp: new Date().toISOString()
      });
    }
    
    // Also handle response.audio_transcript.done events
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && event.transcript.text.trim()) {
      console.log("📝 Processing final transcript:", {
        preview: event.transcript.text.substring(0, 50),
        timestamp: new Date().toISOString()
      });
      
      // Show toast with transcript
      toast.info("Final transcript received", {
        description: event.transcript.text.substring(0, 50) + (event.transcript.text.length > 50 ? "..." : ""),
        duration: 2000,
      });
      
      if (user && conversationId) {
        // Make sure the final transcript is also saved
        try {
          console.log("💾 Saving final transcript:", {
            preview: event.transcript.text.substring(0, 30),
            conversationId,
            timestamp: new Date().toISOString()
          });
          
          saveMessage({
            role: 'user', 
            content: event.transcript.text
          }).then(savedMsg => {
            console.log("✅ Successfully saved final transcript:", {
              messageId: savedMsg?.id,
              timestamp: new Date().toISOString()
            });
          }).catch(err => {
            console.error("❌ Failed to save final transcript:", {
              error: err,
              timestamp: new Date().toISOString()
            });
          });
        } catch (error) {
          console.error("💥 Error saving final transcript:", {
            error,
            timestamp: new Date().toISOString()
          });
        }
        
        // Also use the direct save method as a fallback
        if (saveUserMessage) {
          console.log("📎 Using fallback direct save for final transcript");
          saveUserMessage(event.transcript.text);
        }
      }
    }
  }, [user, conversationId, saveMessage]);

  return {
    handleTranscriptEvent
  };
};
