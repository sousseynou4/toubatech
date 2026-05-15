/**
 * Bearer token verification for the AI sync webhook.
 *
 * Approach:
 *   - Token stored in env var AI_SYNC_API_TOKEN
 *   - Compared in constant time (anti-timing attack)
 *   - Simple in-memory rate limit to slow down brute-force attempts
 *
 * The token MUST be a long random string (32+ chars).
 * Generate with PowerShell:
 *   -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
 */

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function verifyBearerToken(authHeader: string | null): boolean {
  const expected = process.env.AI_SYNC_API_TOKEN;
  if (!expected || expected.length < 24) {
    // Server misconfiguration — block everything rather than weakly auth
    console.error('[ai-sync] AI_SYNC_API_TOKEN is missing or too short');
    return false;
  }

  if (!authHeader) return false;

  // Accept "Bearer xxx" or raw token
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  return constantTimeEqual(token, expected);
}

/* ────────────────────────────────────────────────────────────
 * Simple in-memory rate limiter.
 * Acceptable for a single-server dev / small Vercel setup.
 * For production scale, move to Upstash Redis or similar.
 * ──────────────────────────────────────────────────────────── */

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 min
const RATE_LIMIT_MAX = 30;           // 30 requests per minute per IP

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    buckets.set(ip, bucket);
  }

  bucket.count += 1;
  const allowed = bucket.count <= RATE_LIMIT_MAX;
  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT_MAX - bucket.count),
    resetIn: bucket.resetAt - now,
  };
}

// Garbage-collect old buckets periodically (no leak)
if (typeof globalThis !== 'undefined') {
  const g = globalThis as { __ttRateLimitGc?: ReturnType<typeof setInterval> };
  if (!g.__ttRateLimitGc) {
    g.__ttRateLimitGc = setInterval(() => {
      const now = Date.now();
      for (const [ip, bucket] of buckets.entries()) {
        if (bucket.resetAt < now) buckets.delete(ip);
      }
    }, 5 * 60_000);
  }
}
