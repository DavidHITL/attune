
import { MessageQueue } from '../messageQueue';
import { TranscriptSource } from '../user-messages/types';

export interface TranscriptState {
  transcript: string;
  lastUpdateTime: number;
  isDuplicate: boolean;
}

export interface TranscriptHandlerDependencies {
  messageQueue: MessageQueue;
}
