// GET /api/orders -> listă comenzi (admin)
import { json, requireAdmin } from './_lib.js';

export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all();
  return json((r.results || []).map(o => ({ ...o, items: o.items ? JSON.parse(o.items) : [] })));
}
