import { json, bad, requireSession, missing } from '../_shared.js';

/* List every asset the site owns in Cloudinary.

   The editor uses this to work out which files are still referenced by
   content.json and which are orphans left behind by re-uploads and deleted
   projects. Read-only — deleting still goes through /api/destroy, which has
   its own folder guard. */

const PAGE = 500;          /* Cloudinary's own maximum per request */
const MAX_PAGES = 12;      /* 6000 assets is far past anything this site needs */

async function listKind(env, auth, kind, prefix) {
  const out = [];
  let cursor = '';

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/${kind}`);
    url.searchParams.set('type', 'upload');
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('max_results', String(PAGE));
    if (cursor) url.searchParams.set('next_cursor', cursor);

    const res = await fetch(url, { headers: { authorization: auth } });
    if (res.status === 404) return out;                    /* no assets of this kind yet */
    if (!res.ok) {
      let why = `Cloudinary returned ${res.status}`;
      try { const e = await res.json(); if (e.error?.message) why = e.error.message; } catch { /* keep the status */ }
      throw new Error(why);
    }

    const body = await res.json();
    (body.resources || []).forEach(r => out.push({
      public_id: r.public_id,
      resource_type: r.resource_type || kind,
      format: r.format || '',
      bytes: r.bytes || 0,
      width: r.width || 0,
      height: r.height || 0,
      created_at: r.created_at || ''
    }));

    cursor = body.next_cursor || '';
    if (!cursor) break;
  }
  return out;
}

export async function onRequestGet({ request, env }) {
  const denied = await requireSession(request, env);
  if (denied) return denied;

  const gone = missing(env, ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);
  if (gone) return bad(gone, 500);

  const root = env.CLOUDINARY_FOLDER || 'wnh';
  const auth = 'Basic ' + btoa(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`);

  let assets;
  try {
    const [images, videos] = await Promise.all([
      listKind(env, auth, 'image', root + '/'),
      listKind(env, auth, 'video', root + '/')
    ]);
    assets = images.concat(videos);
  } catch (e) {
    return bad(e.message || 'Could not reach Cloudinary', 502);
  }

  assets.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return json({
    ok: true,
    folder: root,
    cloud: env.CLOUDINARY_CLOUD_NAME,
    count: assets.length,
    bytes: assets.reduce((n, a) => n + a.bytes, 0),
    assets
  });
}
