

// Add to existing file or create if it doesn't exist
declare global {
  interface Window {
    __attuneConversationId?: string;
    attuneMessageQueue?: any;
    conversationContext?: {
      conversationId: string;
      userId: string | null;
      isInitialized: boolean;
      messageCount: number;
    };
  }
}

export {};

