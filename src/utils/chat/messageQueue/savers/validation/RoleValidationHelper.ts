
/**
 * Helps with role validation for message saving
 */
export class RoleValidationHelper {
  /**
   * Validate that a role is either 'user' or 'assistant'
   */
  validateRole(role: string): boolean {
    return role === 'user' || role === 'assistant';
  }

  /**
   * Create a standardized error for invalid roles
   */
  createInvalidRoleError(role: string): Error {
    return new Error(`[RoleValidationHelper] FATAL ERROR: Invalid role "${role}". Must be 'user' or 'assistant'.`);
  }

  /**
   * Throws if role is invalid, otherwise returns the role
   */
  validateRoleOrThrow(role: string): 'user' | 'assistant' {
    if (!this.validateRole(role)) {
      throw this.createInvalidRoleError(role);
    }
    return role as 'user' | 'assistant';
  }

  /**
   * Log an error for invalid roles
   */
  logInvalidRole(role: string, context: string): void {
    console.error(`[${context}] Invalid role: "${role}". Must be 'user' or 'assistant'.`);
  }
}
