
import { SupabaseClient } from '@supabase/supabase-js';

type ConversationIdFn = (userId: string) => Promise<string>;

/**
 * Handles queue initialization and conversation ID management
 */
export class QueueInitializer {
  private initialized = false;
  private initializationPromise: Promise<string | null> | null = null;
  
  constructor(
    private getOrCreateConversationId: ConversationIdFn,
    private supabase: SupabaseClient
  ) {}
  
  /**
   * Check if conversation ID is available and initialize if it is
   */
  checkConversationId(): void {
    // Check if conversation ID already exists in global context
    if (typeof window !== 'undefined' && window.__attuneConversationId) {
      console.log(`[QueueInitializer] Found existing conversation ID: ${window.__attuneConversationId}`);
      this.initialized = true;
      return;
    }

    // Listen for conversation initialization events
    if (typeof document !== 'undefined') {
      document.addEventListener('conversationIdReady', (event: any) => {
        const conversationId = event.detail?.conversationId;
        if (conversationId) {
          console.log(`[QueueInitializer] Received conversation ID from event: ${conversationId}`);
          this.initialized = true;
          
          // Process any pending messages now that conversation is initialized
          if (typeof window !== 'undefined' && window.attuneMessageQueue) {
            console.log(`[QueueInitializer] Triggering message queue flush for ${conversationId}`);
            window.attuneMessageQueue.setConversationInitialized();
          }
        }
      });
    }
  }
  
  /**
   * Ensure we have a valid conversation ID, creating one if necessary
   */
  async ensureConversationId(): Promise<string | null> {
    // Return cached id if we already have one
    if (typeof window !== 'undefined' && window.__attuneConversationId) {
      return window.__attuneConversationId;
    }

    // Start initialization if not already in progress
    if (!this.initializationPromise) {
      this.initializationPromise = new Promise<string | null>(async (resolve) => {
        try {
          // Check for authenticated user
          const { data } = await this.supabase.auth.getUser();
          
          if (data?.user) {
            console.log(`[QueueInitializer] Creating conversation ID for user: ${data.user.id}`);
            const conversationId = await this.getOrCreateConversationId(data.user.id);
            
            if (typeof window !== 'undefined') {
              window.__attuneConversationId = conversationId;
              this.initialized = true;
              
              // Dispatch event to notify other components
              document.dispatchEvent(
                new CustomEvent('conversationIdReady', { 
                  detail: { conversationId } 
                })
              );
              
              console.log(`[QueueInitializer] Conversation ID set globally: ${conversationId}`);
            }
            
            resolve(conversationId);
          } else {
            console.log(`[QueueInitializer] No authenticated user, cannot create conversation`);
            resolve(null);
          }
        } catch (error) {
          console.error(`[QueueInitializer] Error ensuring conversation ID:`, error);
          resolve(null);
        }
      });
    }

    return this.initializationPromise;
  }
  
  /**
   * Check if the queue is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Set the initialized state
   */
  setInitialized(initialized: boolean): void {
    console.log(`[QueueInitializer] Setting initialized to: ${initialized}`);
    this.initialized = initialized;
  }
}
