// GET /api/quotes -> listă cereri de ofertă (admin)
import { json, requireAdmin } from './_lib.js';

export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM quotes ORDER BY id DESC LIMIT 200').all();
  return json(r.results || []);
}
