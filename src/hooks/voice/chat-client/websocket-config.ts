
// WebSocket configuration and constants

// WebSocket connection URL - updated to use OpenAI's Realtime API directly without relying on env variable
// Note: In a production environment, this should ideally go through a secure backend
export const WS_URL = 'https://api.openai.com/v1/realtime';

// Reconnection settings
export const MAX_RECONNECT_ATTEMPTS = 3;
export const RECONNECT_DELAY_MS = 2000;
export const CONNECTION_TIMEOUT_MS = 10000;
