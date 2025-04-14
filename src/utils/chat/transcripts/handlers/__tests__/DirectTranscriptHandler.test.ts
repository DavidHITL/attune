
import { DirectTranscriptHandler } from '../DirectTranscriptHandler';
import { MessageQueue } from '../../../messageQueue';
import { DuplicateTracker } from '../DuplicateTracker';
import { TranscriptNotifier } from '../TranscriptNotifier';

jest.mock('../../../messageQueue');
jest.mock('../DuplicateTracker');
jest.mock('../TranscriptNotifier');

describe('DirectTranscriptHandler', () => {
  let handler: DirectTranscriptHandler;
  let mockMessageQueue: jest.Mocked<MessageQueue>;
  let mockDuplicateTracker: jest.Mocked<DuplicateTracker>;
  let mockNotifier: jest.Mocked<TranscriptNotifier>;

  beforeEach(() => {
    mockMessageQueue = {
      queueMessage: jest.fn(),
    } as any;
    
    mockDuplicateTracker = {
      isDuplicate: jest.fn(),
      markAsProcessed: jest.fn(),
    } as any;
    
    mockNotifier = {
      notifyTranscriptCaptured: jest.fn(),
    } as any;

    handler = new DirectTranscriptHandler(mockMessageQueue);
    (handler as any).duplicateTracker = mockDuplicateTracker;
    (handler as any).notifier = mockNotifier;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDirectTranscript', () => {
    it('should process valid transcript', () => {
      const transcript = 'Hello world';
      mockDuplicateTracker.isDuplicate.mockReturnValue(false);

      handler.handleDirectTranscript(transcript);

      expect(mockDuplicateTracker.isDuplicate).toHaveBeenCalledWith(transcript);
      expect(mockMessageQueue.queueMessage).toHaveBeenCalledWith('user', transcript, true);
      expect(mockDuplicateTracker.markAsProcessed).toHaveBeenCalledWith(transcript);
      expect(mockNotifier.notifyTranscriptCaptured).toHaveBeenCalledWith(transcript);
    });

    it('should skip empty transcripts', () => {
      handler.handleDirectTranscript('');

      expect(mockMessageQueue.queueMessage).not.toHaveBeenCalled();
      expect(mockDuplicateTracker.markAsProcessed).not.toHaveBeenCalled();
      expect(mockNotifier.notifyTranscriptCaptured).not.toHaveBeenCalled();
    });

    it('should skip duplicate transcripts', () => {
      const transcript = 'Hello world';
      mockDuplicateTracker.isDuplicate.mockReturnValue(true);

      handler.handleDirectTranscript(transcript);

      expect(mockDuplicateTracker.isDuplicate).toHaveBeenCalledWith(transcript);
      expect(mockMessageQueue.queueMessage).not.toHaveBeenCalled();
      expect(mockDuplicateTracker.markAsProcessed).not.toHaveBeenCalled();
      expect(mockNotifier.notifyTranscriptCaptured).not.toHaveBeenCalled();
    });
  });
});
