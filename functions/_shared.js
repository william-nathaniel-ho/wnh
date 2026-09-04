/* =============================================================================
   Shared helpers for the Cloudflare Pages Functions.

   Everything secret lives in environment variables and never reaches the
   browser: the GitHub token, the Cloudinary API secret and the admin password
   are only ever read here, server-side.
   ============================================================================= */

const enc = new TextEncoder();

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });

export const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

/* --- base64url ------------------------------------------------------------ */
const b64u = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* --- HMAC ----------------------------------------------------------------- */
async function key(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function hmac(secret, msg) {
  return b64u(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(msg)));
}

/* Constant-time compare. A plain === on a password leaks length and prefix
   through timing; not a big risk here, but it costs nothing to do right. */
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* --- session cookie -------------------------------------------------------
   A signed, expiring token. No database — the signature is the proof.        */
const COOKIE = 'wnh_session';
const TTL = 60 * 60 * 24 * 7;   /* 7 days */

export async function issueSession(env) {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const payload = `v1.${exp}`;
  const sig = await hmac(env.SESSION_SECRET, payload);
  return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`;
}

export const clearSession = () =>
  `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function verifySession(request, env) {
  const raw = (request.headers.get('cookie') || '')
    .split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!raw) return false;
  const parts = raw.slice(COOKIE.length + 1).split('.');
  if (parts.length !== 3) return false;
  const [v, exp, sig] = parts;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(env.SESSION_SECRET, `${v}.${exp}`);
  return safeEqual(sig, expected);
}

export async function requireSession(request, env) {
  return (await verifySession(request, env)) ? null : bad('Not signed in', 401);
}

/* --- env guard ------------------------------------------------------------ */
export function missing(env, names) {
  const gone = names.filter(n => !env[n]);
  return gone.length ? `Missing environment variable(s): ${gone.join(', ')}` : null;
}
