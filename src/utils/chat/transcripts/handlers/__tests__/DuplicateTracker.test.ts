
import { DuplicateTracker } from '../DuplicateTracker';

describe('DuplicateTracker', () => {
  let tracker: DuplicateTracker;

  beforeEach(() => {
    tracker = new DuplicateTracker();
  });

  it('should not mark empty transcripts as duplicates', () => {
    expect(tracker.isDuplicate('')).toBe(false);
    expect(tracker.isDuplicate('  ')).toBe(false);
  });

  it('should correctly track duplicate transcripts', () => {
    const transcript = 'Hello world';
    
    expect(tracker.isDuplicate(transcript)).toBe(false);
    
    tracker.markAsProcessed(transcript);
    expect(tracker.isDuplicate(transcript)).toBe(true);
  });

  it('should cleanup old transcripts when limit is reached', () => {
    const transcripts = Array.from({ length: 30 }, (_, i) => `Transcript ${i}`);
    
    transcripts.forEach(t => tracker.markAsProcessed(t));
    tracker.cleanup(25);
    
    // First 5 should be removed, last 25 should remain
    expect(tracker.isDuplicate(transcripts[0])).toBe(false);
    expect(tracker.isDuplicate(transcripts[29])).toBe(true);
  });

  it('should return correct count of processed transcripts', () => {
    const transcripts = ['one', 'two', 'three'];
    
    transcripts.forEach(t => tracker.markAsProcessed(t));
    expect(tracker.getCount()).toBe(3);
    
    tracker.cleanup(2);
    expect(tracker.getCount()).toBe(2);
  });
});
