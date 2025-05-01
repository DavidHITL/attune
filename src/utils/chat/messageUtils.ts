
import { Message } from '../types';

/**
 * Normalize message role to standard format (user or assistant)
 * CRITICAL FIX: Ensure this preserves assistant role properly
 */
export const normalizeMessageRole = (role?: string): 'user' | 'assistant' => {
  // If role is empty or null, default to user
  if (!role) {
    console.warn('[normalizeMessageRole] ⚠️ Empty role defaulted to "user"');
    return 'user';
  }
  
  const normalizedRole = role.trim().toLowerCase();
  
  // Explicit check for assistant role variations
  if (normalizedRole === 'assistant' || 
      normalizedRole === 'ai' || 
      normalizedRole === 'bot' || 
      normalizedRole === 'system') {
    console.log('[normalizeMessageRole] 🤖 Role normalized to "assistant" from:', role);
    return 'assistant';
  }
  
  // All other roles default to user
  if (normalizedRole !== 'user') {
    console.log('[normalizeMessageRole] 👤 Non-standard role normalized to "user" from:', role);
  }
  
  return 'user';
};

/**
 * Ensure message has a valid role
 */
export const ensureValidMessageRole = (message: Partial<Message>): Partial<Message> & { role: 'user' | 'assistant' } => {
  // Skip normalization for already valid roles
  if (message.role === 'user' || message.role === 'assistant') {
    console.log(`[ensureValidMessageRole] ✅ Role already valid: ${message.role}`);
    return message as Partial<Message> & { role: 'user' | 'assistant' };
  }
  
  // Normalize role only if needed
  console.log(`[ensureValidMessageRole] 🔄 Normalizing role: "${message.role}"`);
  return {
    ...message,
    role: normalizeMessageRole(message.role)
  };
};

/**
 * Check if a message role is valid
 */
export const isValidMessageRole = (role?: string): boolean => {
  if (!role) return false;
  const normalizedRole = role.trim().toLowerCase();
  return normalizedRole === 'user' || normalizedRole === 'assistant';
};
