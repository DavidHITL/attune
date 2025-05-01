
import { Message } from '../types';

/**
 * Normalize message role to standard format (user or assistant)
 * Critical implementation to preserve role correctness
 */
export const normalizeMessageRole = (role?: string): 'user' | 'assistant' => {
  // If role is empty or null, this is an error condition requiring notification
  if (!role) {
    console.error('[normalizeMessageRole] ❌ Empty role provided, this should never happen');
    return 'user';
  }
  
  const normalizedRole = role.trim().toLowerCase();
  
  // Primary role determination with explicit logging for traceability
  if (normalizedRole === 'assistant' || 
      normalizedRole === 'ai' || 
      normalizedRole === 'bot' || 
      normalizedRole === 'system') {
    console.log('[normalizeMessageRole] 🤖 ASSISTANT role preserved:', role);
    return 'assistant';
  }
  
  if (normalizedRole === 'user' || normalizedRole === 'human') {
    console.log('[normalizeMessageRole] 👤 USER role preserved:', role);
    return 'user';
  }
  
  // Unknown role - this is an error condition that should be logged
  console.error(`[normalizeMessageRole] ❓ Unknown role "${role}" defaulting to user, but this should be fixed`);
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
