import { json, bad, requireSession, missing } from '../_shared.js';

/* Permanently delete one asset from Cloudinary.

   Two guards, because this cannot be undone:
   - a valid session, same as every other write
   - the public_id must sit inside CLOUDINARY_FOLDER, so a stray or crafted
     request can never reach anything else in the account */
export async function onRequestPost({ request, env }) {
  const denied = await requireSession(request, env);
  if (denied) return denied;

  const gone = missing(env, ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);
  if (gone) return bad(gone, 500);

  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }

  const publicId = String(body.public_id || '').trim();
  if (!publicId) return bad('No public_id given');

  const root = env.CLOUDINARY_FOLDER || 'wnh';
  if (publicId !== root && !publicId.startsWith(root + '/')) {
    return bad(`Refusing to delete "${publicId}" — it is outside the ${root}/ folder`, 403);
  }

  const kind = body.resource_type === 'video' ? 'video' : 'image';
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: 'true', public_id: publicId, timestamp };
  const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');

  const digest = await crypto.subtle.digest(
    'SHA-1', new TextEncoder().encode(toSign + env.CLOUDINARY_API_SECRET)
  );
  const signature = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('timestamp', String(timestamp));
  form.append('invalidate', 'true');
  form.append('api_key', env.CLOUDINARY_API_KEY);
  form.append('signature', signature);

  let res, out;
  try {
    res = await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${kind}/destroy`,
      { method: 'POST', body: form }
    );
    out = await res.json();
  } catch {
    return bad('Could not reach Cloudinary', 502);
  }

  /* Cloudinary answers 200 with {result:"not found"} for an id that is already
     gone — treat that as done rather than as an error, so a retry after a
     half-failed delete does not dead-end the editor. */
  if (out.result === 'ok' || out.result === 'not found') {
    return json({ ok: true, result: out.result, public_id: publicId });
  }
  return bad(out.error?.message || `Cloudinary said: ${out.result || 'unknown'}`, 502);
}
