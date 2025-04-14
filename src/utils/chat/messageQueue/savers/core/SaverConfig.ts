
import { SaveMessageCallback } from '../../../../types';

/**
 * Configuration for message saver components
 */
export interface SaverConfig {
  saveMessageCallback: SaveMessageCallback;
}

/**
 * Creates configuration object for message saver components
 */
export const createSaverConfig = (
  saveMessageCallback: SaveMessageCallback
): SaverConfig => {
  return { saveMessageCallback };
};
