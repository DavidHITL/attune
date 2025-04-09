
export interface Message {
  id: string;
  created_at?: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface UseConversationReturn {
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
  saveMessage: (message: Partial<Message>) => Promise<Message | null>;
  addLocalMessage: (message: Message) => void;
  loadMessages: (convoId: string) => Promise<Message[]>;
}

// Add MediaRecorderState type if it doesn't exist
export type MediaRecorderState = 'recording' | 'paused' | 'inactive';

// Ensure MessageCallback, StatusCallback, and SaveMessageCallback types are defined
export type MessageCallback = (event: any) => void;
export type StatusCallback = (status: string) => void;
export type SaveMessageCallback = (message: Partial<Message>) => Promise<Message | null>;
