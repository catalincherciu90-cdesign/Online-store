// POST /api/admin/login  { user, password } -> { ok, token }
import { json, signJWT } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const { user, password } = await request.json().catch(() => ({}));
  const U = env.ADMIN_USER || 'admin';
  // ADMIN_PASSWORD trebuie setat ca secret; altfel login-ul eșuează mereu.
  if (user === U && password && env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) {
    const token = await signJWT({ admin: true, user: U }, env.JWT_SECRET || 'dev-secret-change-me');
    return json({ ok: true, token });
  }
  return json({ ok: false, error: 'Credențiale invalide.' }, 401);
}
