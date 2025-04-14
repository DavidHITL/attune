
/**
 * Validates message content before saving
 */
export class ContentValidator {
  /**
   * Check if content is valid (non-empty)
   */
  isValidContent(content: string | undefined): boolean {
    return !!content && content.trim() !== '';
  }
  
  /**
   * Validate content with detailed error message
   */
  validateContent(role: 'user' | 'assistant', content: string | undefined): { 
    valid: boolean, 
    reason?: string 
  } {
    if (!content) {
      return { valid: false, reason: `Missing content for ${role} message` };
    }
    
    if (content.trim() === '') {
      return { valid: false, reason: `Empty content for ${role} message` };
    }
    
    return { valid: true };
  }
}
