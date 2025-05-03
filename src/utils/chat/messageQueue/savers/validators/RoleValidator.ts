
/**
 * Validates message roles
 */
export class RoleValidator {
  /**
   * Check if role is valid ('user' or 'assistant')
   */
  isValidRole(role: string): boolean {
    return role === 'user' || role === 'assistant';
  }

  /**
   * Create a standardized error for invalid roles
   */
  createInvalidRoleError(role: string): Error {
    return new Error(`Invalid role: "${role}". Must be 'user' or 'assistant'.`);
  }

  /**
   * Validate role or throw an error
   */
  validateRoleOrThrow(role: string): 'user' | 'assistant' {
    if (!this.isValidRole(role)) {
      throw this.createInvalidRoleError(role);
    }
    return role as 'user' | 'assistant';
  }
}
