// PUT    /api/products/:id  -> actualizează (admin)
// DELETE /api/products/:id  -> dezactivează (soft delete) (admin)
import { json, requireAdmin } from '../_lib.js';

export async function onRequestPut({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const p = await request.json().catch(() => null);
  if (!p) return json({ error: 'Date invalide.' }, 400);
  await env.DB.prepare(
    `UPDATE products SET cat=?,name=?,price=?,unit=?,badge=?,descr=?,specs=?,options=? WHERE id=?`
  ).bind(
    p.cat, p.name, Number(p.price) || 0, p.unit || 'buc', p.badge || null,
    p.desc || '', JSON.stringify(p.specs || {}), p.options ? JSON.stringify(p.options) : null,
    params.id
  ).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('UPDATE products SET active=0 WHERE id=?').bind(params.id).run();
  return json({ ok: true });
}
