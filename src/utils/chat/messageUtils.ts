
/**
 * Validates and normalizes message role
 */
export const normalizeMessageRole = (role?: string): 'user' | 'assistant' => {
  // Default to 'user' if role is undefined or invalid
  if (role === 'user' || role === 'assistant') {
    return role;
  }
  return 'user'; // Default fallback
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
