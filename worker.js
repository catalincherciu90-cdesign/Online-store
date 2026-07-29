// Acoperiș PRO — Cloudflare Worker
// Servește site-ul static (binding ASSETS) + API-ul /api/* cu bază de date D1.
// Înlocuiește Pages Functions (care nu rulează pe un Worker).

/* ── Utilitare ─────────────────────────────────────────────────────────── */
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtLei = v => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0) + ' lei';

function b64u(s) { return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function fromb64u(s) { return atob(s.replace(/-/g, '+').replace(/_/g, '/')); }
function toBase64(ab) {
  const bytes = new Uint8Array(ab); let bin = ''; const ch = 0x8000;
  for (let i = 0; i < bytes.length; i += ch) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + ch));
  return btoa(bin);
}

async function signJWT(payload, secret, expSec = 8 * 3600) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = b64u(JSON.stringify({ ...payload, iat: now, exp: now + expSec }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${b}`));
  return `${h}.${b}.${b64u(String.fromCharCode(...new Uint8Array(sig)))}`;
}
async function verifyJWT(token, secret) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('token invalid');
  const [h, b, s] = parts;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sig = Uint8Array.from(fromb64u(s), c => c.charCodeAt(0));
  if (!await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(`${h}.${b}`))) throw new Error('semnătură invalidă');
  const p = JSON.parse(fromb64u(b));
  if (p.exp && p.exp < Date.now() / 1000) throw new Error('token expirat');
  return p;
}
async function requireAdmin(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/, '');
  if (!token) return null;
  try { const p = await verifyJWT(token, env.JWT_SECRET || 'dev-secret-change-me'); return p && p.admin ? p : null; }
  catch { return null; }
}

function rowToProduct(r) {
  return {
    id: r.id, cat: r.cat, name: r.name, price: r.price, unit: r.unit,
    badge: r.badge || null, desc: r.descr || '',
    specs: r.specs ? JSON.parse(r.specs) : {},
    options: r.options ? JSON.parse(r.options) : undefined,
    active: !!r.active,
  };
}
async function upsertProduct(env, p) {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO products (id,cat,name,price,unit,badge,descr,specs,options,active)
     VALUES (?,?,?,?,?,?,?,?,?,1)`
  ).bind(
    p.id, p.cat, p.name, Number(p.price) || 0, p.unit || 'buc', p.badge || null,
    p.desc || '', JSON.stringify(p.specs || {}), p.options ? JSON.stringify(p.options) : null
  ).run();
}

/* ── Handlere API ──────────────────────────────────────────────────────── */
async function login(request, env) {
  const { user, password } = await request.json().catch(() => ({}));
  const U = env.ADMIN_USER || 'admin';
  if (user === U && password && env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) {
    const token = await signJWT({ admin: true, user: U }, env.JWT_SECRET || 'dev-secret-change-me');
    return json({ ok: true, token });
  }
  return json({ ok: false, error: 'Credențiale invalide.' }, 401);
}

async function productsList(env) {
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM products WHERE active=1 ORDER BY rowid').all();
  return json((r.results || []).map(rowToProduct));
}
async function productsCreate(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const p = await request.json().catch(() => null);
  if (!p || !p.id || !p.name || !p.cat) return json({ error: 'Date produs incomplete.' }, 400);
  await upsertProduct(env, p);
  return json({ ok: true });
}
async function productUpdate(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const p = await request.json().catch(() => null);
  if (!p) return json({ error: 'Date invalide.' }, 400);
  await env.DB.prepare(
    `UPDATE products SET cat=?,name=?,price=?,unit=?,badge=?,descr=?,specs=?,options=? WHERE id=?`
  ).bind(
    p.cat, p.name, Number(p.price) || 0, p.unit || 'buc', p.badge || null,
    p.desc || '', JSON.stringify(p.specs || {}), p.options ? JSON.stringify(p.options) : null, id
  ).run();
  return json({ ok: true });
}
async function productDelete(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('UPDATE products SET active=0 WHERE id=?').bind(id).run();
  return json({ ok: true });
}
async function seed(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const { products } = await request.json().catch(() => ({ products: [] }));
  if (!Array.isArray(products)) return json({ error: 'Format invalid.' }, 400);
  let n = 0;
  for (const p of products) { if (p && p.id) { await upsertProduct(env, p); n++; } }
  return json({ ok: true, imported: n });
}
async function ordersList(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all();
  return json((r.results || []).map(o => ({ ...o, items: o.items ? JSON.parse(o.items) : [] })));
}
async function quotesList(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM quotes ORDER BY id DESC LIMIT 200').all();
  return json(r.results || []);
}

async function sendEmail(env, payload) {
  if (!env.RESEND_API_KEY) return { delivered: false, error: 'Email neconfigurat.' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: env.QUOTE_FROM || 'Acoperis PRO <onboarding@resend.dev>', ...payload }),
    });
    return { delivered: r.ok, error: r.ok ? null : `Resend HTTP ${r.status}` };
  } catch (e) { return { delivered: false, error: String(e) }; }
}

async function orderCreate(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'Date invalide.' }, 400);
  const { nume, prenume, telefon, email, adresa, oras, judet, obs, items, total } = body;
  if (!nume || !telefon || !adresa || !Array.isArray(items) || !items.length) return json({ ok: false, error: 'Date incomplete.' }, 400);
  const ref = 'CMD-' + Date.now().toString().slice(-6);
  if (env.DB) {
    try {
      await env.DB.prepare(`INSERT INTO orders (ref,nume,prenume,telefon,email,adresa,oras,judet,obs,items,total) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(ref, nume, prenume || '', telefon, email || '', adresa, oras || '', judet || '', obs || '', JSON.stringify(items), Number(total) || 0).run();
    } catch (e) { console.error('DB order', e); }
  }
  const rows = items.map(it => `<tr><td>${esc(it.nume)}${it.optiuni ? `<br><small>${esc(it.optiuni)}</small>` : ''}</td><td align="center">${esc(it.cant)} ${esc(it.unit || '')}</td><td align="right">${fmtLei(it.pret)}</td></tr>`).join('');
  const to = env.ORDER_TO_EMAIL || env.QUOTE_TO_EMAIL;
  let res = { delivered: false, error: 'Email neconfigurat.' };
  if (to) res = await sendEmail(env, { to: [to], reply_to: email || undefined, subject: `Comandă ${ref} — ${prenume || ''} ${nume}`,
    html: `<h2>Comandă ${esc(ref)}</h2><p>${esc(prenume)} ${esc(nume)} · ${esc(telefon)} · ${esc(email)}<br>${esc(adresa)}, ${esc(oras)}, ${esc(judet)}</p><table border="1" cellpadding="6" style="border-collapse:collapse">${rows}</table><p><b>Total: ${fmtLei(total)}</b> (ramburs)</p>` });
  return json({ ok: true, ref, delivered: res.delivered });
}

async function quoteCreate(request, env) {
  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'Date invalide.' }, 400); }
  const g = k => (form.get(k) || '').toString().trim();
  const nume = g('nume'), telefon = g('telefon'), email = g('email'), tip = g('tip'), suprafata = g('suprafata'), mesaj = g('mesaj');
  if (!nume || !telefon || !email || !mesaj) return json({ ok: false, error: 'Completează câmpurile obligatorii.' }, 400);
  const file = form.get('plan');
  let attachment = null, planInfo = 'Fără plan atașat.';
  if (file && typeof file === 'object' && file.size > 0) {
    if (file.size > 15 * 1024 * 1024) return json({ ok: false, error: 'Fișierul depășește 15 MB.' }, 413);
    attachment = { filename: file.name || 'plan', content: toBase64(await file.arrayBuffer()) };
    planInfo = `${file.name} (${(file.size / 1048576).toFixed(2)} MB)`;
  }
  const ref = 'OF-' + Date.now().toString().slice(-6);
  if (env.DB) {
    try {
      await env.DB.prepare(`INSERT INTO quotes (ref,nume,telefon,email,tip,suprafata,mesaj,plan) VALUES (?,?,?,?,?,?,?,?)`)
        .bind(ref, nume, telefon, email, tip, suprafata, mesaj, planInfo).run();
    } catch (e) { console.error('DB quote', e); }
  }
  const to = env.QUOTE_TO_EMAIL;
  if (to) {
    const payload = { to: [to], reply_to: email, subject: `Cerere ofertă ${ref} — ${nume}`,
      html: `<h2>Cerere ofertă ${esc(ref)}</h2><p>${esc(nume)} · ${esc(telefon)} · ${esc(email)}</p><p>Tip: ${esc(tip)} · ${esc(suprafata)} mp · Plan: ${esc(planInfo)}</p><p>${esc(mesaj)}</p>` };
    if (attachment) payload.attachments = [attachment];
    await sendEmail(env, payload);
  }
  return json({ ok: true, ref });
}

/* ── Router ────────────────────────────────────────────────────────────── */
async function api(request, env, url) {
  const p = url.pathname, m = request.method;
  if (p === '/api/admin/login' && m === 'POST') return login(request, env);
  if (p === '/api/products' && m === 'GET') return productsList(env);
  if (p === '/api/products' && m === 'POST') return productsCreate(request, env);
  const pid = p.match(/^\/api\/products\/(.+)$/);
  if (pid && m === 'PUT') return productUpdate(request, env, decodeURIComponent(pid[1]));
  if (pid && m === 'DELETE') return productDelete(request, env, decodeURIComponent(pid[1]));
  if (p === '/api/admin/seed' && m === 'POST') return seed(request, env);
  if (p === '/api/orders' && m === 'GET') return ordersList(request, env);
  if (p === '/api/quotes' && m === 'GET') return quotesList(request, env);
  if (p === '/api/order' && m === 'POST') return orderCreate(request, env);
  if (p === '/api/quote' && m === 'POST') return quoteCreate(request, env);
  return json({ error: 'Ruta nu există.' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env, url); }
      catch (e) { console.error(e); return json({ error: 'Eroare internă.' }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};
