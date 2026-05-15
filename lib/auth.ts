/**
 * TOUBA TECH — Authentication primitives for the admin back-office.
 *
 * Uses Web Crypto API (HMAC-SHA256) so it works in BOTH:
 *   - Edge runtime (middleware.ts)
 *   - Node.js runtime (API routes)
 *
 * Strategy:
 *   - Master password stored in ADMIN_PASSWORD env var
 *   - Successful login sets an HTTP-only signed cookie
 *   - Cookie format: `<expiresUnixSeconds>.<hexHmacSignature>`
 *   - Middleware verifies the cookie on every /admin/* request
 *
 * The cookie is NOT a JWT — no claims, no header. Just an expiration
 * timestamp signed with HMAC-SHA256. Smaller, simpler, sufficient
 * for a single-admin back-office.
 */

export const SESSION_COOKIE_NAME = 'tt_admin_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bytesToHex(signature);
}

/**
 * Constant-time string comparison. Prevents timing-based attacks
 * where an attacker measures response time to deduce the secret.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = String(expiresAt);
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  // Check expiration
  const expiresAt = Number.parseInt(payload, 10);
  if (!Number.isFinite(expiresAt)) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  // Verify signature (constant-time)
  const expectedSignature = await sign(payload, secret);
  return constantTimeEqual(signature, expectedSignature);
}

/**
 * Compare the user-submitted password against the env-stored one,
 * in constant time.
 */
export function verifyMasterPassword(input: string, expected: string): boolean {
  return constantTimeEqual(input, expected);
}

/**
 * Helper to read env vars with clear errors at the call site.
 */
export function requireAdminEnv(): { password: string; secret: string } {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required');
  }
  if (!secret || secret.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET environment variable is required and must be at least 32 characters'
    );
  }
  return { password, secret };
}
