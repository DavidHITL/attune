
export type MessageEvent = {
  type: string;
  [key: string]: any;
};

export type MessageCallback = (event: MessageEvent) => void;
export type StatusCallback = (status: string) => void;
export type SaveMessageCallback = (role: 'user' | 'assistant', content: string) => Promise<void>;
export type AudioActivityCallback = (state: 'start' | 'stop') => void;
