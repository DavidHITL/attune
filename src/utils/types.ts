export interface UserInsight {
  id: string;
  user_id: string;
  conversation_id?: string | null;
  triggers: string[];
  losing_strategies: {
    primary: string;
    scores: {
      beingRight: number;
      control: number;
      unbridledExpression: number;
      retaliation: number;
      withdrawal: number;
    };
  };
  suggestions: string[];
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  conversation_id: string;
  start_message_id: string;
  end_message_id: string;
  start_date: string;
  end_date: string;
  summary_content: string;
  key_points: string[];
  batch_number: number;
  created_at: string;
}

export interface Message {
  id: string;
  created_at?: string;
  role: 'user' | 'assistant';
  content: string;
  conversation_id?: string;
  user_id?: string;  // Add this property to fix the TypeScript error
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
