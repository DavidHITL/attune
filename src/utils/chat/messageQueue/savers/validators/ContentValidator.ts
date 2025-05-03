
/**
 * Validates message content
 */
export class ContentValidator {
  /**
   * Check if content is valid (non-empty)
   */
  isValidContent(content: string | null | undefined): boolean {
    return !!content && content.trim() !== '';
  }

  /**
   * Create a standardized error for invalid content
   */
  createInvalidContentError(): Error {
    return new Error('Invalid message content: Message content cannot be empty');
  }
}
