
/**
 * This file re-exports the MessageSaveService from its original location.
 * This pattern avoids circular dependencies when other modules need to import the service.
 */
export { messageSaveService } from './MessageSaveService';
