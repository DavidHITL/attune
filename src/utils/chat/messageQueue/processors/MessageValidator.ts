
type ContentValidator = (role: 'user' | 'assistant', content: string) => boolean;

export class MessageValidator {
  private contentValidator: ContentValidator;
  
  constructor(contentValidator: ContentValidator) {
    this.contentValidator = contentValidator;
  }
  
  isValidMessage(role: 'user' | 'assistant', content: string): boolean {
    // First check if the role is valid
    if (role !== 'user' && role !== 'assistant') {
      console.log(`Invalid message role: ${role}`);
      return false;
    }
    
    // Then delegate content validation to the provided validator
    if (!this.contentValidator(role, content)) {
      console.log(`Invalid message content for ${role} role`);
      return false;
    }
    
    return true;
  }
}
