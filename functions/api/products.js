// GET  /api/products         -> listă produse active (public)
// POST /api/products         -> creează/înlocuiește produs (admin)
import { json, requireAdmin } from './_lib.js';

export function rowToProduct(r) {
  return {
    id: r.id, cat: r.cat, name: r.name, price: r.price, unit: r.unit,
    badge: r.badge || null, desc: r.descr || '',
    specs: r.specs ? JSON.parse(r.specs) : {},
    options: r.options ? JSON.parse(r.options) : undefined,
    active: !!r.active,
  };
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM products WHERE active=1 ORDER BY rowid').all();
  return json((r.results || []).map(rowToProduct));
}

export async function onRequestPost({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const p = await request.json().catch(() => null);
  if (!p || !p.id || !p.name || !p.cat) return json({ error: 'Date produs incomplete.' }, 400);
  await env.DB.prepare(
    `INSERT OR REPLACE INTO products (id,cat,name,price,unit,badge,descr,specs,options,active)
     VALUES (?,?,?,?,?,?,?,?,?,1)`
  ).bind(
    p.id, p.cat, p.name, Number(p.price) || 0, p.unit || 'buc', p.badge || null,
    p.desc || '', JSON.stringify(p.specs || {}), p.options ? JSON.stringify(p.options) : null
  ).run();
  return json({ ok: true });
}
