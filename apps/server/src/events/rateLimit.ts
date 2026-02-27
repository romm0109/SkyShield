export interface RateLimitOptions {
  minIntervalMs: number;
  staleAfterMs?: number;
  now?: () => number;
}

interface RateLimitEntry {
  lastAllowedAt: number;
  lastSeenAt: number;
}

export interface SocketRateLimiter {
  allow: (socketId: string, eventName: string) => boolean;
  prune: () => void;
  size: () => number;
}

const DEFAULT_STALE_AFTER_MS = 60_000;
const PRUNE_EVERY = 64;

export function createSocketRateLimiter(options: RateLimitOptions): SocketRateLimiter {
  const now = options.now ?? Date.now;
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const entries = new Map<string, RateLimitEntry>();
  let operationCount = 0;

  const prune = (): void => {
    const current = now();
    for (const [key, entry] of entries) {
      if (current - entry.lastSeenAt > staleAfterMs) {
        entries.delete(key);
      }
    }
  };

  const allow = (socketId: string, eventName: string): boolean => {
    operationCount += 1;
    if (operationCount % PRUNE_EVERY === 0) {
      prune();
    }

    const key = `${socketId}:${eventName}`;
    const current = now();
    const existing = entries.get(key);
    if (!existing) {
      entries.set(key, { lastAllowedAt: current, lastSeenAt: current });
      return true;
    }

    existing.lastSeenAt = current;
    if (current - existing.lastAllowedAt < options.minIntervalMs) {
      return false;
    }

    existing.lastAllowedAt = current;
    return true;
  };

  const size = (): number => entries.size;

  return { allow, prune, size };
}
