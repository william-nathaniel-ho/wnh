import { json, bad, issueSession, safeEqual, missing } from '../_shared.js';

export async function onRequestPost({ request, env }) {
  const gone = missing(env, ['ADMIN_PASSWORD', 'SESSION_SECRET']);
  if (gone) return bad(gone, 500);

  let body;
  try { body = await request.json(); } catch { return bad('Bad request'); }

  /* A deliberate delay so this endpoint is not a fast password oracle. */
  await new Promise(r => setTimeout(r, 400));

  if (!safeEqual(String(body.password || ''), env.ADMIN_PASSWORD)) {
    return bad('Wrong password', 401);
  }
  return json({ ok: true }, 200, { 'set-cookie': await issueSession(env) });
}
