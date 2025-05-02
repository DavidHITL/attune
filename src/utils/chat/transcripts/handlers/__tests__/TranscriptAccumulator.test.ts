
import { TranscriptAccumulator } from '../TranscriptAccumulator';

describe('TranscriptAccumulator', () => {
  let accumulator: TranscriptAccumulator;

  beforeEach(() => {
    accumulator = new TranscriptAccumulator();
  });

  it('should accumulate text correctly', () => {
    accumulator.accumulateText('Hello');
    accumulator.accumulateText(' ');
    accumulator.accumulateText('world');
    
    expect(accumulator.getAccumulatedText()).toBe('Hello world');
  });

  it('should reset accumulated text', () => {
    accumulator.accumulateText('Hello world');
    accumulator.reset();
    
    expect(accumulator.getAccumulatedText()).toBe('');
  });

  it('should track transcript staleness correctly', () => {
    accumulator.accumulateText('Hello');
    
    // Should not be stale immediately
    expect(accumulator.isTranscriptStale()).toBe(false);
    
    // Wait for staleness threshold
    jest.advanceTimersByTime(1600);
    expect(accumulator.isTranscriptStale()).toBe(true);
  });

  it('should track last transcript time', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    
    accumulator.accumulateText('Hello');
    expect(accumulator.getLastTranscriptTime()).toBe(now);
  });

  it('should not modify transcript when adding empty text', () => {
    accumulator.accumulateText('Hello');
    accumulator.accumulateText('');
    accumulator.accumulateText(null as any);
    
    expect(accumulator.getAccumulatedText()).toBe('Hello');
  });
});
