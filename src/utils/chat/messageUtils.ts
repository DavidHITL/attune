import { Message } from '../types'; // Import Message type from types file

/**
 * Validates and normalizes message role
 */
export const normalizeMessageRole = (role?: string): 'user' | 'assistant' => {
  return role?.toLowerCase?.() === 'assistant' ? 'assistant'
       : role?.toLowerCase?.() === 'user'      ? 'user'
       : 'user';
};

/**
 * Ensures a message object has a valid role
 */
export const ensureValidMessageRole = (message: Partial<Message>): Message => {
  return {
    ...message,
    role: normalizeMessageRole(message.role),
    content: message.content || '',
    id: message.id || `temp-${Date.now()}`,
    created_at: message.created_at || new Date().toISOString()
  } as Message;
};
