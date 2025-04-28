
import { QueueStatus } from '../QueueTypes';

export class QueueStatusTracker {
  constructor(
    private getQueueLength: () => number,
    private getPendingUserMessages: () => number,
    private getActiveSaves: () => number
  ) {}

  getQueueStatus(): QueueStatus {
    return {
      queueLength: this.getQueueLength(),
      pendingUserMessages: this.getPendingUserMessages(),
      activeSaves: this.getActiveSaves()
    };
  }
}
