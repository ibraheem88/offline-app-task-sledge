export type BackoffOptions = {
  baseDelayMs: number;
  maxDelayMs: number;
  /** After this many failed attempts the item waits for a manual retry. */
  maxAttempts: number;
};

export const DEFAULT_BACKOFF: BackoffOptions = {
  baseDelayMs: 2_000,
  maxDelayMs: 5 * 60_000,
  maxAttempts: 5,
};

/**
 * Delay before retrying after `attempt` failures (1-based): 2s, 4s, 8s… capped at maxDelayMs.
 * Half of the delay is random ("equal jitter") so many devices coming back online
 * at the same moment don't all hit the server in lockstep.
 */
export function retryDelayMs(attempt: number, options: BackoffOptions, random: () => number = Math.random): number {
  const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
  return exponential / 2 + random() * (exponential / 2);
}

/** When to retry next, or null when the item has used all its automatic attempts. */
export function nextRetryTime(
  attempts: number,
  now: number,
  options: BackoffOptions,
  random: () => number = Math.random,
): number | null {
  if (attempts >= options.maxAttempts) return null;
  return now + retryDelayMs(attempts, options, random);
}
