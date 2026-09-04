import { json, verifySession } from '../_shared.js';

export async function onRequestGet({ request, env }) {
  return json({
    ok: true,
    signedIn: await verifySession(request, env),
    cloud: env.CLOUDINARY_CLOUD_NAME || '',
    folder: env.CLOUDINARY_FOLDER || 'wnh',
    repo: env.GITHUB_REPO || '',
    branch: env.GITHUB_BRANCH || 'main'
  });
}
