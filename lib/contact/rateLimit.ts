type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const store = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkContactRateLimit(identifier: string) {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const normalizedIdentifier = identifier || 'anonymous';
  const currentEntry = store.get(normalizedIdentifier);

  if (!currentEntry || currentEntry.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };
    store.set(normalizedIdentifier, nextEntry);

    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetAt: nextEntry.resetAt,
    };
  }

  if (currentEntry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: currentEntry.resetAt,
    };
  }

  currentEntry.count += 1;
  store.set(normalizedIdentifier, currentEntry);

  return {
    allowed: true,
    remaining: Math.max(0, MAX_REQUESTS - currentEntry.count),
    resetAt: currentEntry.resetAt,
  };
}
