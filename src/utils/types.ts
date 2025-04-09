
export type MessageEvent = {
  type: string;
  [key: string]: any;
};

export type MessageCallback = (event: MessageEvent) => void;
export type StatusCallback = (status: string) => void;
export type SaveMessageCallback = (role: 'user' | 'assistant', content: string) => Promise<void>;
export type AudioActivityCallback = (state: 'start' | 'stop') => void;

// Conversation types
export type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
};

export type UseConversationReturn = {
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
  saveMessage: (message: Message) => Promise<Message | null>;
  addLocalMessage: (message: Message) => void;
  loadMessages: (convoId: string) => Promise<Message[]>;
};
