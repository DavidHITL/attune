
// WebSocket configuration and constants

// WebSocket connection URL
export const WS_URL = import.meta.env.VITE_ATTUNE_WEBSOCKET_URL || 'ws://localhost:8080';

// Reconnection settings
export const MAX_RECONNECT_ATTEMPTS = 3;
export const RECONNECT_DELAY_MS = 2000;
export const CONNECTION_TIMEOUT_MS = 10000;
