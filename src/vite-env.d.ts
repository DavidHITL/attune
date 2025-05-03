
/// <reference types="vite/client" />

// Extend Window interface to include our global variables
declare global {
  interface Window {
    conversationContext?: {
      conversationId: string | null;
      userId: string | null;
      isInitialized: boolean;
      messageCount: number;
    };
    attuneMessageQueue?: any; // MessageQueue instance
  }
}

export {}
