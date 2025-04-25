
export interface Message {
  id: string;
  created_at?: string;
  role: 'user' | 'assistant';
  content: string;
  conversation_id?: string; // Add this optional property
}
