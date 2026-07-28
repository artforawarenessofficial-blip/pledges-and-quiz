export const ADMIN_COOKIE_NAME = 'admin_token';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Derives the admin session-cookie value from server-side secrets.
 *
 * The cookie is an HMAC-SHA256 of ADMIN_PASSWORD keyed by ADMIN_SECRET, so the
 * value is not guessable and cannot be forged without knowing the secret. This
 * replaces the old hardcoded 'admin_authenticated' sentinel.
 *
 * Uses the Web Crypto API so it runs in both the Node.js and Edge (middleware)
 * runtimes. Returns null if the server is misconfigured so auth fails closed.
 */
export async function computeAdminToken(): Promise<string | null> {
  const secret = process.env.ADMIN_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  if (!secret || !password) return null;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(password));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time verification of an admin session token. Returns false if the
 * server is misconfigured (missing secrets) so auth fails closed.
 */
export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await computeAdminToken();
  if (!expected) return false;
  if (token.length !== expected.length) return false;
  // Constant-time compare to avoid leaking the token via timing.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
