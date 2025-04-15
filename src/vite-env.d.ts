
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_FUNCTION_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface AttuneMessageQueue {
  setConversationInitialized: () => void;
  queueMessage: (role: 'user' | 'assistant', content: string, priority?: boolean) => void;
  isInitialized: () => boolean;
  forceFlushQueue: () => Promise<void>;
}

interface ConversationContext {
  conversationId: string | null;
  userId: string | null;  // Making sure this is not optional but allowing null
  isInitialized: boolean;
  messageCount: number;
}

// This properly augments the Window interface
declare global {
  interface Window {
    attuneMessageQueue?: AttuneMessageQueue;
    conversationContext?: ConversationContext;
  }
}

// This export empty object ensures the file is treated as a module
export {};
