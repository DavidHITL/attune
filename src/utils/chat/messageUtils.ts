
import { Message } from '../types';

/**
 * Normalizes the message role to either 'user' or 'assistant'
 * This is a defensive function to ensure valid roles
 */
export function normalizeMessageRole(role?: string): 'user' | 'assistant' {
  console.log(`[normalizeMessageRole] Normalizing role: ${role}`);
  
  if (!role) {
    console.warn('[normalizeMessageRole] No role provided, defaulting to "user"');
    return 'user';
  }
  
  // Convert to lowercase for case-insensitive comparison
  const normalizedRole = role.toLowerCase();
  
  // Only allow 'user' or 'assistant' roles
  if (normalizedRole === 'assistant') {
    return 'assistant';
  }
  
  // Default to 'user' for any other value
  if (normalizedRole !== 'user') {
    console.warn(`[normalizeMessageRole] Invalid role "${role}", defaulting to "user"`);
  }
  
  return 'user';
}

/**
 * Ensures that a message has a valid role
 */
export function ensureValidMessageRole(message: Partial<Message>): Partial<Message> {
  if (!message) {
    return { role: 'user', content: '' };
  }
  
  const normalizedRole = normalizeMessageRole(message.role);
  
  // Log if the role was changed
  if (normalizedRole !== message.role) {
    console.warn(`[ensureValidMessageRole] Changed invalid role "${message.role}" to "${normalizedRole}"`);
  } else {
    console.log(`[ensureValidMessageRole] Role "${normalizedRole}" is valid, no changes needed`);
  }
  
  return {
    ...message,
    role: normalizedRole
  };
}

/**
 * Validates if a role string is acceptable
 */
export function isValidRole(role?: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return normalizedRole === 'user' || normalizedRole === 'assistant';
}
