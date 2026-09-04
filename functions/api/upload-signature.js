import { json, bad, requireSession, missing } from '../_shared.js';

/* Cloudinary signed upload.

   The browser never sees CLOUDINARY_API_SECRET. It asks here for a signature
   scoped to one folder and one timestamp, then POSTs the file straight to
   Cloudinary — so the file itself never passes through this worker and there
   is no request-size ceiling to worry about. */
export async function onRequestPost({ request, env }) {
  const denied = await requireSession(request, env);
  if (denied) return denied;

  const gone = missing(env, ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);
  if (gone) return bad(gone, 500);

  let body = {};
  try { body = await request.json(); } catch { /* defaults are fine */ }

  const root = env.CLOUDINARY_FOLDER || 'wnh';
  const sub = String(body.folder || '').replace(/[^a-z0-9\-_/]/gi, '');
  const folder = sub ? `${root}/${sub}` : root;
  const timestamp = Math.floor(Date.now() / 1000);

  /* Cloudinary signs the sorted, &-joined param string plus the secret. */
  const params = { folder, timestamp };
  const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');

  const digest = await crypto.subtle.digest(
    'SHA-1', new TextEncoder().encode(toSign + env.CLOUDINARY_API_SECRET)
  );
  const signature = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');

  return json({
    ok: true,
    cloud: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    folder, timestamp, signature,
    endpoint: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`
  });
}
