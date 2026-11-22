/**
 * One-password protection. The cookie holds a hash of APP_PASSWORD + AUTH_SECRET,
 * so changing either value logs every device out.
 * Uses Web Crypto, which works both in middleware (Edge) and in Node.
 */
export const SESSION_COOKIE = 'cooking_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // one year

export async function sessionToken(password: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${secret}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Compares two strings in constant time (for equal lengths). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
