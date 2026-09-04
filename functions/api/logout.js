import { json, clearSession } from '../_shared.js';
export const onRequestPost = () => json({ ok: true }, 200, { 'set-cookie': clearSession() });
