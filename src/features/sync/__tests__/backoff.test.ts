import { nextRetryTime, retryDelayMs, type BackoffOptions } from '../backoff';

const options: BackoffOptions = { baseDelayMs: 1_000, maxDelayMs: 10_000, maxAttempts: 4 };
const noJitter = () => 1;
const fullJitter = () => 0;

describe('retryDelayMs', () => {
  it('doubles the delay after each failed attempt', () => {
    expect(retryDelayMs(1, options, noJitter)).toBe(1_000);
    expect(retryDelayMs(2, options, noJitter)).toBe(2_000);
    expect(retryDelayMs(3, options, noJitter)).toBe(4_000);
  });

  it('never exceeds the maximum delay', () => {
    expect(retryDelayMs(20, options, noJitter)).toBe(10_000);
  });

  it('keeps jitter between half and the full exponential delay', () => {
    expect(retryDelayMs(3, options, fullJitter)).toBe(2_000);
    for (let i = 0; i < 100; i += 1) {
      const delay = retryDelayMs(3, options);
      expect(delay).toBeGreaterThanOrEqual(2_000);
      expect(delay).toBeLessThanOrEqual(4_000);
    }
  });
});

describe('nextRetryTime', () => {
  it('schedules the retry relative to now', () => {
    expect(nextRetryTime(2, 50_000, options, noJitter)).toBe(52_000);
  });

  it('returns null once the maximum number of attempts is used', () => {
    expect(nextRetryTime(3, 0, options, noJitter)).not.toBeNull();
    expect(nextRetryTime(4, 0, options, noJitter)).toBeNull();
  });
});
