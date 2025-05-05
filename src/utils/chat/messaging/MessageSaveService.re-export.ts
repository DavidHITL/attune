
/**
 * Re-export the original MessageSaveService to fix import paths
 * This file should be imported by modules that need messageSaveService
 * to avoid circular dependencies
 */
export { messageSaveService } from './MessageSaveService';
