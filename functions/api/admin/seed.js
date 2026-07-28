// POST /api/admin/seed  { products: [...] }  -> importă în masă (admin)
// Folosit de admin.html pentru a popula D1 din catalogul static (data.js).
import { json, requireAdmin } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const { products } = await request.json().catch(() => ({ products: [] }));
  if (!Array.isArray(products)) return json({ error: 'Format invalid.' }, 400);
  const stmt = env.DB.prepare(
    `INSERT OR REPLACE INTO products (id,cat,name,price,unit,badge,descr,specs,options,active)
     VALUES (?,?,?,?,?,?,?,?,?,1)`
  );
  const batch = products.filter(p => p && p.id).map(p => stmt.bind(
    p.id, p.cat, p.name, Number(p.price) || 0, p.unit || 'buc', p.badge || null,
    p.desc || '', JSON.stringify(p.specs || {}), p.options ? JSON.stringify(p.options) : null
  ));
  if (batch.length) await env.DB.batch(batch);
  return json({ ok: true, imported: batch.length });
}
