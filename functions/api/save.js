import { json, bad, requireSession, missing } from '../_shared.js';

const GH = 'https://api.github.com';
const PATH = 'content.json';

const headers = (env) => ({
  authorization: `Bearer ${env.GITHUB_TOKEN}`,
  accept: 'application/vnd.github+json',
  'user-agent': 'wnh-admin',
  'x-github-api-version': '2022-11-28'
});

/* GET — current content plus its blob sha, so the editor can detect that
   someone (or a previous tab) changed the file underneath it. */
export async function onRequestGet({ request, env }) {
  const denied = await requireSession(request, env);
  if (denied) return denied;
  const gone = missing(env, ['GITHUB_TOKEN', 'GITHUB_REPO']);
  if (gone) return bad(gone, 500);

  const branch = env.GITHUB_BRANCH || 'main';
  const r = await fetch(`${GH}/repos/${env.GITHUB_REPO}/contents/${PATH}?ref=${branch}`, { headers: headers(env) });
  if (!r.ok) return bad(`GitHub read failed (${r.status})`, 502);

  const file = await r.json();
  const text = new TextDecoder().decode(
    Uint8Array.from(atob(file.content.replace(/\n/g, '')), c => c.charCodeAt(0))
  );
  return json({ ok: true, sha: file.sha, content: JSON.parse(text) });
}

/* PUT — commit new content.json. Cloudflare Pages redeploys on the push. */
export async function onRequestPut({ request, env }) {
  const denied = await requireSession(request, env);
  if (denied) return denied;
  const gone = missing(env, ['GITHUB_TOKEN', 'GITHUB_REPO']);
  if (gone) return bad(gone, 500);

  let body;
  try { body = await request.json(); } catch { return bad('Bad request'); }
  if (!body.content || typeof body.content !== 'object') return bad('No content');
  if (!Array.isArray(body.content.projects)) return bad('Content is missing a projects array');

  const branch = env.GITHUB_BRANCH || 'main';

  /* Re-read the sha at commit time. If it moved since the editor loaded,
     refuse rather than silently overwriting someone else's edit. */
  const head = await fetch(`${GH}/repos/${env.GITHUB_REPO}/contents/${PATH}?ref=${branch}`, { headers: headers(env) });
  if (!head.ok) return bad(`GitHub read failed (${head.status})`, 502);
  const current = await head.json();
  if (body.sha && body.sha !== current.sha) {
    return bad('This file changed since you loaded it. Reload the editor, then republish.', 409);
  }

  const pretty = JSON.stringify(body.content, null, 2) + '\n';
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(pretty)));

  const put = await fetch(`${GH}/repos/${env.GITHUB_REPO}/contents/${PATH}`, {
    method: 'PUT',
    headers: { ...headers(env), 'content-type': 'application/json' },
    body: JSON.stringify({
      message: body.message || 'Update content via /admin',
      content: b64,
      sha: current.sha,
      branch
    })
  });

  if (!put.ok) return bad(`GitHub write failed (${put.status}): ${await put.text()}`, 502);
  const out = await put.json();
  return json({ ok: true, sha: out.content.sha, commit: out.commit.html_url });
}
