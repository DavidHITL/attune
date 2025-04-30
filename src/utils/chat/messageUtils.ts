
import { Message } from '../types'; // Import Message type from types file

/**
 * Validates and normalizes message role
 */
export const normalizeMessageRole = (role?: string): 'user' | 'assistant' => {
  if (!role) {
    console.warn('No role provided to normalizeMessageRole, this is likely a bug');
    // CRITICAL FIX: Never default the role, always throw an error
    throw new Error('Missing message role - role must be explicitly provided');
  }
  
  const normalizedRole = role.toLowerCase();
  if (normalizedRole !== 'user' && normalizedRole !== 'assistant') {
    console.warn(`Invalid role provided: "${role}", must be 'user' or 'assistant'`);
    throw new Error(`Invalid message role: ${role}`);
  }
  
  return normalizedRole as 'user' | 'assistant';
};

/**
 * Ensures a message object has a valid role
 */
export const ensureValidMessageRole = (message: Partial<Message>): Message => {
  if (!message.role) {
    console.warn('Message missing role property in ensureValidMessageRole');
    throw new Error('Message must have an explicit role property');
  }
  
  return {
    ...message,
    role: normalizeMessageRole(message.role),
    content: message.content || '',
    id: message.id || `temp-${Date.now()}`,
    created_at: message.created_at || new Date().toISOString()
  } as Message;
};
