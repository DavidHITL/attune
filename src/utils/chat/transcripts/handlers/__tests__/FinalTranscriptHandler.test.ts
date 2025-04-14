
import { FinalTranscriptHandler } from '../FinalTranscriptHandler';
import { MessageQueue } from '../../../messageQueue';
import { DuplicateTracker } from '../DuplicateTracker';
import { TranscriptNotifier } from '../TranscriptNotifier';
import { TranscriptAccumulator } from '../TranscriptAccumulator';

jest.mock('../../../messageQueue');
jest.mock('../DuplicateTracker');
jest.mock('../TranscriptNotifier');
jest.mock('../TranscriptAccumulator');

describe('FinalTranscriptHandler', () => {
  let handler: FinalTranscriptHandler;
  let mockMessageQueue: jest.Mocked<MessageQueue>;
  let mockDuplicateTracker: jest.Mocked<DuplicateTracker>;
  let mockNotifier: jest.Mocked<TranscriptNotifier>;
  let mockAccumulator: jest.Mocked<TranscriptAccumulator>;

  beforeEach(() => {
    mockMessageQueue = {
      queueMessage: jest.fn(),
    } as any;
    
    mockDuplicateTracker = {
      isDuplicate: jest.fn(),
      markAsProcessed: jest.fn(),
      cleanup: jest.fn(),
    } as any;
    
    mockNotifier = {
      notifyTranscriptSaved: jest.fn(),
    } as any;
    
    mockAccumulator = {
      getAccumulatedText: jest.fn(),
      reset: jest.fn(),
    } as any;

    handler = new FinalTranscriptHandler(mockMessageQueue, mockAccumulator);
    (handler as any).duplicateTracker = mockDuplicateTracker;
    (handler as any).notifier = mockNotifier;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleFinalTranscript', () => {
    it('should process valid final transcript', () => {
      const transcript = 'Hello world';
      mockDuplicateTracker.isDuplicate.mockReturnValue(false);

      handler.handleFinalTranscript(transcript);

      expect(mockDuplicateTracker.isDuplicate).toHaveBeenCalledWith(transcript);
      expect(mockMessageQueue.queueMessage).toHaveBeenCalledWith('user', transcript, true);
      expect(mockDuplicateTracker.markAsProcessed).toHaveBeenCalledWith(transcript);
      expect(mockAccumulator.reset).toHaveBeenCalled();
      expect(mockNotifier.notifyTranscriptSaved).toHaveBeenCalledWith(transcript);
    });

    it('should use accumulated text when no final transcript is provided', () => {
      const accumulatedText = 'Accumulated text';
      mockAccumulator.getAccumulatedText.mockReturnValue(accumulatedText);
      mockDuplicateTracker.isDuplicate.mockReturnValue(false);

      handler.handleFinalTranscript(undefined);

      expect(mockMessageQueue.queueMessage).toHaveBeenCalledWith('user', accumulatedText, true);
      expect(mockDuplicateTracker.markAsProcessed).toHaveBeenCalledWith(accumulatedText);
      expect(mockAccumulator.reset).toHaveBeenCalled();
      expect(mockNotifier.notifyTranscriptSaved).toHaveBeenCalledWith(accumulatedText, "accumulated");
    });

    it('should skip empty transcripts and empty accumulated text', () => {
      mockAccumulator.getAccumulatedText.mockReturnValue('');
      
      handler.handleFinalTranscript('');

      expect(mockMessageQueue.queueMessage).not.toHaveBeenCalled();
      expect(mockDuplicateTracker.markAsProcessed).not.toHaveBeenCalled();
      expect(mockNotifier.notifyTranscriptSaved).not.toHaveBeenCalled();
    });

    it('should skip duplicate transcripts', () => {
      const transcript = 'Hello world';
      mockDuplicateTracker.isDuplicate.mockReturnValue(true);

      handler.handleFinalTranscript(transcript);

      expect(mockDuplicateTracker.isDuplicate).toHaveBeenCalledWith(transcript);
      expect(mockMessageQueue.queueMessage).not.toHaveBeenCalled();
      expect(mockDuplicateTracker.markAsProcessed).not.toHaveBeenCalled();
      expect(mockNotifier.notifyTranscriptSaved).not.toHaveBeenCalled();
    });

    it('should cleanup duplicate tracker after processing', () => {
      handler.handleFinalTranscript('Hello world');
      expect(mockDuplicateTracker.cleanup).toHaveBeenCalled();
    });
  });
});
