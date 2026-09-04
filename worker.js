// ExpoTigla — Cloudflare Worker
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
// Comparație în timp constant (evită timing attacks pe parolă)
function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
// Hashing parolă (PBKDF2-SHA256, salt aleator) pentru adminii din baza de date
const toHex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const fromHex = h => new Uint8Array((h.match(/.{1,2}/g) || []).map(x => parseInt(x, 16)));
async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return { hash: toHex(bits), salt: toHex(salt) };
}
async function requireAdmin(request, env) {
  if (!env.JWT_SECRET) return null; // fail-closed: fără secret, niciun token nu e valid
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/, '');
  if (!token) return null;
  try { const p = await verifyJWT(token, env.JWT_SECRET); return p && p.admin ? p : null; }
  catch { return null; }
}
// Autentificare client (cont propriu). Tokenul poartă emailul clientului.
async function requireCustomer(request, env) {
  if (!env.JWT_SECRET) return null;
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/, '');
  if (!token) return null;
  try { const p = await verifyJWT(token, env.JWT_SECRET); return p && p.customer ? p : null; }
  catch { return null; }
}

// Auto-migrare: creează tabelele care ar putea lipsi (idempotent, CREATE IF NOT
// EXISTS). Rulează o singură dată per isolate, ca site-ul să meargă fără să fie
// nevoie de `wrangler d1 execute`.
let SCHEMA_READY = null;
async function ensureSchema(env) {
  if (!env.DB) return;
  if (!SCHEMA_READY) {
    SCHEMA_READY = (async () => {
      const stmts = [
        `CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT 5, text TEXT NOT NULL, source TEXT DEFAULT 'Google', sort INTEGER DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS option_values (grp TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, delta REAL DEFAULT 0, hex TEXT, sort INTEGER DEFAULT 0, PRIMARY KEY (grp, id))`,
        `CREATE TABLE IF NOT EXISTS banners (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, subtitle TEXT, cta_label TEXT, cta_href TEXT, image TEXT, align TEXT DEFAULT 'left', height TEXT DEFAULT 'md', sort INTEGER DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
        `CREATE TABLE IF NOT EXISTS producers (id TEXT PRIMARY KEY, name TEXT NOT NULL, logo TEXT, sort INTEGER DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, title TEXT NOT NULL, excerpt TEXT, content TEXT, image TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, pass_hash TEXT NOT NULL, pass_salt TEXT NOT NULL, name TEXT, created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS product_files (product_id TEXT NOT NULL, kind TEXT NOT NULL, mime TEXT, data TEXT, name TEXT, updated_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (product_id, kind))`,
        `CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, role TEXT, content TEXT, created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages (session_id, id)`,
        `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, tag TEXT, descr TEXT, icon TEXT, options TEXT, image TEXT, sort INTEGER DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)`,
        `CREATE TABLE IF NOT EXISTS customers (email TEXT PRIMARY KEY, pass_hash TEXT NOT NULL, pass_salt TEXT NOT NULL, name TEXT, phone TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      ];
      for (const s of stmts) { try { await env.DB.prepare(s).run(); } catch (e) { console.error('ensureSchema', e); } }
      // Coloane adăugate ulterior pe produse (ALTER nu e idempotent → ignoră „duplicate column").
      for (const col of ['producator TEXT', 'finish_label TEXT']) {
        try { await env.DB.prepare(`ALTER TABLE products ADD COLUMN ${col}`).run(); } catch (e) { /* există deja */ }
      }
      try { await env.DB.prepare('ALTER TABLE categories ADD COLUMN image TEXT').run(); } catch (e) { /* există deja */ }
      for (const col of ['align TEXT', 'height TEXT', 'image_mobile TEXT']) {
        try { await env.DB.prepare(`ALTER TABLE banners ADD COLUMN ${col}`).run(); } catch (e) { /* există deja */ }
      }
      try { await env.DB.prepare('ALTER TABLE orders ADD COLUMN status_log TEXT').run(); } catch (e) { /* există deja */ }
      for (const col of ['tip_client TEXT', 'firma TEXT', 'cui TEXT', 'reg_com TEXT']) {
        try { await env.DB.prepare(`ALTER TABLE orders ADD COLUMN ${col}`).run(); } catch (e) { /* există deja */ }
        try { await env.DB.prepare(`ALTER TABLE quotes ADD COLUMN ${col}`).run(); } catch (e) { /* există deja */ }
      }
      // Prima rulare: populează categoriile din valorile implicite, dacă tabelul e gol.
      try {
        const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM categories').first();
        if (!cnt || !cnt.n) {
          let sort = 0;
          for (const c of DEFAULT_CATEGORIES) {
            await env.DB.prepare('INSERT OR IGNORE INTO categories (id,name,tag,descr,icon,options,sort,active) VALUES (?,?,?,?,?,?,?,1)')
              .bind(c.id, c.name, c.tag || null, c.desc || null, c.icon || null, JSON.stringify(c.options || []), sort++).run();
          }
        }
      } catch (e) { console.error('seed categories', e); }
    })();
  }
  return SCHEMA_READY;
}

function rowToProduct(r) {
  return {
    id: r.id, cat: r.cat, name: r.name, price: r.price, unit: r.unit,
    badge: r.badge || null, desc: r.descr || '', producator: r.producator || '',
    specs: r.specs ? JSON.parse(r.specs) : {},
    options: r.options ? JSON.parse(r.options) : undefined,
    optionPrices: r.option_prices ? JSON.parse(r.option_prices) : undefined,
    finishColors: r.finish_colors ? JSON.parse(r.finish_colors) : undefined,
    colorPrices: r.color_prices ? JSON.parse(r.color_prices) : undefined,
    finishes: r.finishes ? JSON.parse(r.finishes) : undefined,
    finishLabel: r.finish_label || undefined,
    active: !!r.active,
  };
}
const jstr = o => (o && (Array.isArray(o) ? o.length : Object.keys(o).length) ? JSON.stringify(o) : null);
async function upsertProduct(env, p) {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO products (id,cat,name,price,unit,badge,descr,producator,specs,options,option_prices,finish_colors,color_prices,finishes,finish_label,active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
  ).bind(
    p.id, p.cat, p.name, Number(p.price) || 0, p.unit || 'buc', p.badge || null,
    p.desc || '', p.producator || null, JSON.stringify(p.specs || {}), p.options ? JSON.stringify(p.options) : null,
    jstr(p.optionPrices), jstr(p.finishColors), jstr(p.colorPrices), jstr(p.finishes), (p.finishLabel || '').trim() || null
  ).run();
}

/* ── Handlere API ──────────────────────────────────────────────────────── */
async function login(request, env) {
  if (!env.JWT_SECRET) return json({ ok: false, error: 'Autentificare neconfigurată pe server (lipsește JWT_SECRET).' }, 500);
  const { user, password } = await request.json().catch(() => ({}));
  if (!user || !password) return json({ ok: false, error: 'Credențiale invalide.' }, 401);
  // 1) Contul principal (din configurarea serverului) — nu poate fi șters
  const U = env.ADMIN_USER || 'admin';
  if (env.ADMIN_PASSWORD && user === U && safeEqual(password, env.ADMIN_PASSWORD)) {
    return json({ ok: true, token: await signJWT({ admin: true, user: U }, env.JWT_SECRET) });
  }
  // 2) Administratori suplimentari (din baza de date, parole hash-uite)
  if (env.DB) {
    const row = await env.DB.prepare('SELECT * FROM admins WHERE username=?').bind((user || '').toLowerCase()).first();
    if (row) {
      const { hash } = await hashPassword(password, row.pass_salt);
      if (safeEqual(hash, row.pass_hash)) {
        return json({ ok: true, token: await signJWT({ admin: true, user: row.username }, env.JWT_SECRET) });
      }
    }
  }
  return json({ ok: false, error: 'Credențiale invalide.' }, 401);
}
async function adminsList(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT username, name, created_at FROM admins ORDER BY username').all();
  return json(r.results || []);
}
async function adminUpsert(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => null);
  const username = ((v && v.username) || '').trim().toLowerCase();
  if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) return json({ error: 'Utilizator invalid (3-32 caractere: litere, cifre, . _ -).' }, 400);
  if (username === (env.ADMIN_USER || 'admin').toLowerCase()) return json({ error: 'Acest nume e rezervat contului principal.' }, 400);
  const existing = await env.DB.prepare('SELECT username FROM admins WHERE username=?').bind(username).first();
  if (v.password) {
    if (String(v.password).length < 6) return json({ error: 'Parola trebuie să aibă minim 6 caractere.' }, 400);
    const { hash, salt } = await hashPassword(v.password);
    await env.DB.prepare('INSERT OR REPLACE INTO admins (username, pass_hash, pass_salt, name) VALUES (?,?,?,?)').bind(username, hash, salt, v.name || '').run();
  } else if (existing) {
    await env.DB.prepare('UPDATE admins SET name=? WHERE username=?').bind(v.name || '', username).run();
  } else {
    return json({ error: 'Parola e obligatorie pentru un administrator nou.' }, 400);
  }
  return json({ ok: true, username });
}
async function adminDelete(request, env, username) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('DELETE FROM admins WHERE username=?').bind((username || '').toLowerCase()).run();
  return json({ ok: true });
}

/* ── Diagnostic email (Resend) — doar pentru admin ─────────────────────────── */
async function mailCheck(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  return json({
    resend_key: !!env.RESEND_API_KEY,
    quote_from: env.QUOTE_FROM || null,
    quote_to: env.QUOTE_TO_EMAIL || null,
    order_to: env.ORDER_TO_EMAIL || null,
  });
}
async function mailTest(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  const { to } = await request.json().catch(() => ({}));
  const dest = ((to || env.QUOTE_TO_EMAIL || '') + '').trim();
  if (!EMAIL_RE.test(dest)) return json({ ok: false, error: 'Completează o adresă de email validă pentru test.' }, 400);
  const mail = await sendEmail(env, {
    to: [dest],
    subject: 'Test email — ExpoTigla',
    html: '<h2>Test reușit ✅</h2><p>Acesta este un email de test trimis din configurarea ExpoTigla. Dacă îl vezi, trimiterea prin Resend funcționează corect.</p>',
  });
  return json({
    ok: !!mail.delivered,
    resend_key: !!env.RESEND_API_KEY,
    from: env.QUOTE_FROM || 'onboarding@resend.dev (implicit)',
    to: dest,
    error: mail.error || null,
  });
}

async function chatTest(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  let s = {};
  try {
    const r = await env.DB.prepare(`SELECT key,value FROM settings WHERE key IN ('chatbot_provider','chatbot_model')`).all();
    for (const row of (r.results || [])) if (row.value) s[row.key] = row.value;
  } catch (e) { /* fără DB → implicit */ }
  const provName = s.chatbot_provider || 'groq';
  const prov = CHAT_PROVIDERS[provName] || CHAT_PROVIDERS.groq;
  let key = '', keyVar = '';
  for (const k of prov.keys) { if (env[k]) { key = env[k]; keyVar = k; break; } }
  const base = { provider: provName, key_present: !!key, key_var: keyVar || (prov.keys && prov.keys[0]) };
  if (!key) return json({ ...base, ok: false, error: 'Lipsește cheia ' + (prov.keys && prov.keys[0]) + ' în Cloudflare.' });
  const model = (s.chatbot_model && s.chatbot_model.trim()) || prov.model;
  const tryModels = [model];
  for (const fm of (prov.fallbacks || [])) if (fm && !tryModels.includes(fm)) tryModels.push(fm);
  let r = null, lastStatus = 0, lastDetail = '';
  for (const mdl of tryModels) {
    try {
      r = await fetch(prov.url, { method: 'POST', headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: mdl, max_tokens: 5, temperature: 0, messages: [{ role: 'user', content: 'Spune doar: ok' }] }) });
    } catch (e) { return json({ ...base, ok: false, model: mdl, error: 'Nu am putut contacta serviciul.' }); }
    if (r.ok) {
      const d = await r.json().catch(() => ({}));
      const reply = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
      return json({ ...base, ok: true, model: mdl, reply: reply.slice(0, 80) });
    }
    lastStatus = r.status; lastDetail = (await r.text().catch(() => '')).slice(0, 300);
    const modelGone = r.status === 404 || /model_not_found|does not exist|decommission/i.test(lastDetail);
    if (!modelGone) break;
  }
  return json({ ...base, ok: false, model: tryModels[0], status: lastStatus, error: lastDetail || ('HTTP ' + lastStatus) });
}

/* ── Conturi clienți (înregistrare / autentificare / istoric comenzi) ──────── */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CUSTOMER_TOKEN_TTL = 30 * 24 * 3600; // 30 de zile
async function accountRegister(request, env) {
  if (!env.JWT_SECRET) return json({ ok: false, error: 'Autentificare neconfigurată pe server.' }, 500);
  if (!env.DB) return json({ ok: false, error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => ({}));
  const email = clip((v.email || '').trim().toLowerCase(), 160);
  const name = clip((v.name || '').trim(), 120);
  const phone = clip((v.phone || '').trim(), 40);
  const password = String(v.password || '');
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Adresă de email invalidă.' }, 400);
  if (password.length < 6) return json({ ok: false, error: 'Parola trebuie să aibă minim 6 caractere.' }, 400);
  if (!name) return json({ ok: false, error: 'Numele este obligatoriu.' }, 400);
  const existing = await env.DB.prepare('SELECT email FROM customers WHERE email=?').bind(email).first();
  if (existing) return json({ ok: false, error: 'Există deja un cont cu acest email. Autentifică-te.' }, 409);
  const { hash, salt } = await hashPassword(password);
  await env.DB.prepare('INSERT INTO customers (email, pass_hash, pass_salt, name, phone) VALUES (?,?,?,?,?)').bind(email, hash, salt, name, phone).run();
  const token = await signJWT({ customer: email, name }, env.JWT_SECRET, CUSTOMER_TOKEN_TTL);
  return json({ ok: true, token, name, email });
}
async function accountLogin(request, env) {
  if (!env.JWT_SECRET) return json({ ok: false, error: 'Autentificare neconfigurată pe server.' }, 500);
  if (!env.DB) return json({ ok: false, error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => ({}));
  const email = clip((v.email || '').trim().toLowerCase(), 160);
  const password = String(v.password || '');
  if (!email || !password) return json({ ok: false, error: 'Completează email și parolă.' }, 400);
  const row = await env.DB.prepare('SELECT * FROM customers WHERE email=?').bind(email).first();
  if (row) {
    const { hash } = await hashPassword(password, row.pass_salt);
    if (safeEqual(hash, row.pass_hash)) {
      const token = await signJWT({ customer: email, name: row.name || '' }, env.JWT_SECRET, CUSTOMER_TOKEN_TTL);
      return json({ ok: true, token, name: row.name || '', email });
    }
  }
  return json({ ok: false, error: 'Email sau parolă greșită.' }, 401);
}
async function accountMe(request, env) {
  const c = await requireCustomer(request, env);
  if (!c) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const row = await env.DB.prepare('SELECT email, name, phone, created_at FROM customers WHERE email=?').bind(c.customer).first();
  if (!row) return json({ error: 'Cont inexistent.' }, 404);
  return json(row);
}
async function accountOrders(request, env) {
  const c = await requireCustomer(request, env);
  if (!c) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT id, ref, status, status_log, items, total, adresa, oras, judet, created_at FROM orders WHERE lower(email)=? ORDER BY id DESC LIMIT 100').bind(c.customer).all();
  return json((r.results || []).map(o => ({
    ref: o.ref, status: o.status || 'nou', total: o.total, created_at: o.created_at,
    adresa: o.adresa, oras: o.oras, judet: o.judet,
    items: o.items ? JSON.parse(o.items) : [],
    statusLog: o.status_log ? JSON.parse(o.status_log) : [],
  })));
}

async function productsList(env) {
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM products WHERE active=1 ORDER BY rowid').all();
  const products = (r.results || []).map(rowToProduct);
  // Atașează URL-ul pozei principale (din D1) pentru cardurile din listă/grilă,
  // dintr-o singură interogare (nu un fetch /api/pf per produs).
  try {
    const pf = await env.DB.prepare("SELECT product_id, LENGTH(data) AS len FROM product_files WHERE kind='main'").all();
    const mainMap = {};
    (pf.results || []).forEach(x => { mainMap[x.product_id] = x.len || 0; });
    products.forEach(p => { if (p.id in mainMap) p.img = `/api/pf/${encodeURIComponent(p.id)}/main?v=${mainMap[p.id]}`; });
  } catch (e) { /* fără poze — cad pe fișier/placeholder */ }
  return json(products);
}
async function productsCreate(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const p = await request.json().catch(() => null);
  if (!p || !p.id || !p.name || !p.cat) return json({ error: 'Date produs incomplete.' }, 400);
  const existing = await env.DB.prepare('SELECT 1 FROM products WHERE id=?').bind(p.id).first();
  if (existing) return json({ error: 'Există deja un produs cu codul „' + p.id + '". Alege alt cod sau editează produsul existent.' }, 409);
  await upsertProduct(env, p);
  return json({ ok: true });
}
async function productUpdate(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const p = await request.json().catch(() => null);
  if (!p) return json({ error: 'Date invalide.' }, 400);
  await env.DB.prepare(
    `UPDATE products SET cat=?,name=?,price=?,unit=?,badge=?,descr=?,producator=?,specs=?,options=?,option_prices=?,finish_colors=?,color_prices=?,finishes=?,finish_label=? WHERE id=?`
  ).bind(
    p.cat, p.name, Number(p.price) || 0, p.unit || 'buc', p.badge || null,
    p.desc || '', p.producator || null, JSON.stringify(p.specs || {}), p.options ? JSON.stringify(p.options) : null,
    jstr(p.optionPrices), jstr(p.finishColors), jstr(p.colorPrices), jstr(p.finishes), (p.finishLabel || '').trim() || null, id
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
  return json((r.results || []).map(o => ({ ...o, items: o.items ? JSON.parse(o.items) : [], statusLog: o.status_log ? JSON.parse(o.status_log) : [] })));
}
const ORDER_STATUSES = ['nou', 'confirmata', 'in-livrare', 'livrata', 'anulata'];
const STATUS_LABEL = { nou: 'Nou', confirmata: 'Confirmată', 'in-livrare': 'În livrare', livrata: 'Livrată', anulata: 'Anulată' };
// Mesaj trimis clientului la schimbarea statusului (nu și pentru „nou")
const STATUS_CLIENT_MSG = {
  confirmata: 'Comanda ta a fost <b>confirmată</b>. O pregătim pentru livrare și te ținem la curent.',
  'in-livrare': 'Comanda ta este <b>în livrare</b> — pornește spre tine. Plata se face ramburs, la primire.',
  livrata: 'Comanda ta a fost <b>livrată</b>. Îți mulțumim că ai ales ExpoTigla!',
  anulata: 'Comanda ta a fost <b>anulată</b>. Dacă e o greșeală sau ai întrebări, te rugăm contactează-ne.',
};
async function orderStatusUpdate(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const { status } = await request.json().catch(() => ({}));
  if (!ORDER_STATUSES.includes(status)) return json({ error: 'Status invalid.' }, 400);
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
  if (!o) return json({ error: 'Comanda nu există.' }, 404);
  // Adaugă în istoricul de status
  let log = [];
  try { log = o.status_log ? JSON.parse(o.status_log) : []; } catch (e) { log = []; }
  log.push({ status, at: new Date().toISOString(), by: admin.user || 'admin' });
  await env.DB.prepare('UPDATE orders SET status=?, status_log=? WHERE id=?').bind(status, JSON.stringify(log), id).run();
  // Email către client (best-effort; necesită RESEND_API_KEY + emailul clientului)
  let delivered = false;
  if (o.email && env.RESEND_API_KEY && STATUS_CLIENT_MSG[status]) {
    const res = await sendEmail(env, { to: [o.email], subject: `Comanda ${esc(o.ref)} — ${STATUS_LABEL[status]}`,
      html: `<h2>Salut, ${esc(o.prenume || o.nume)}!</h2><p>${STATUS_CLIENT_MSG[status]}</p>
        <p>Comanda: <b>${esc(o.ref)}</b> · Total: <b>${fmtLei(o.total)}</b> (ramburs)</p>
        <p>Ai întrebări? Răspunde la acest email.<br>— Echipa ExpoTigla</p>` });
    delivered = res.delivered;
  }
  return json({ ok: true, status, emailSent: delivered });
}
async function quotesList(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM quotes ORDER BY id DESC LIMIT 200').all();
  return json(r.results || []);
}

// ── Proprietăți globale (finisaje / grosimi / culori) ──
// Categorii implicite (folosite la prima populare a tabelului `categories`).
const DEFAULT_CATEGORIES = [
  { id: 'tigla-metalica', name: 'Țiglă metalică', icon: 'tigla', tag: 'clasic, modular', desc: 'Soluții pentru acoperișuri rezidențiale, într-o varietate de profile, finisaje și culori.', options: ['finisaj', 'grosime', 'culoare'] },
  { id: 'tabla-faltuita', name: 'Tablă fălțuită', icon: 'falt', tag: 'standing seam, click', desc: 'Aspect modern și linii curate pentru proiecte rezidențiale și arhitectură contemporană.', options: ['finisaj', 'grosime', 'culoare'] },
  { id: 'panouri-sandwich', name: 'Panouri sandwich', icon: 'panou', tag: 'PUR, PIR', desc: 'Soluții eficiente pentru hale, spații industriale și construcții comerciale.', options: ['culoare'] },
  { id: 'sistem-pluvial', name: 'Sisteme pluviale', icon: 'pluvial', tag: 'jgheaburi, burlane', desc: 'Jgheaburi, burlane și accesorii pentru evacuarea eficientă a apei.', options: ['finisaj', 'culoare'] },
  { id: 'borduri', name: 'Borduri și tinichigerie', icon: 'accesoriu', tag: 'coame, șorțuri, dolii', desc: 'Coame, șorțuri, dolii, pazii și parazăpezi pentru finisarea și etanșarea acoperișului.', options: ['finisaj', 'culoare'] },
  { id: 'ventilatii', name: 'Ventilații acoperiș', icon: 'accesoriu', tag: 'coșuri, treceri cabluri', desc: 'Coșuri de ventilație, treceri cabluri și elemente de aerisire pentru acoperiș.', options: ['finisaj', 'culoare'] },
  { id: 'folii-membrane', name: 'Folii și membrane', icon: 'folie', tag: 'anticondens, difuzie', desc: 'Protecție suplimentară și control al umidității pentru sistemul de acoperiș.', options: ['finisaj'] },
  { id: 'suruburi', name: 'Șuruburi', icon: 'accesoriu', tag: 'autoforante, torx', desc: 'Șuruburi autoforante cu cap torx și garnitură, în diverse dimensiuni și culori RAL.', options: ['finisaj', 'culoare'] },
  { id: 'accesorii', name: 'Altele', icon: 'accesoriu', tag: 'coame, parazăpezi', desc: 'Elementele necesare pentru un sistem complet și un montaj corect.', options: ['finisaj', 'culoare'] },
];
function rowToCategory(r) {
  let options = [];
  try { options = r.options ? JSON.parse(r.options) : []; } catch (e) { options = []; }
  const c = { id: r.id, name: r.name, tag: r.tag || '', desc: r.descr || '', icon: r.icon || 'accesoriu', options, sort: r.sort || 0 };
  if (r.imglen) c.img = `/api/categories/${encodeURIComponent(r.id)}/image?v=${r.imglen}`;
  return c;
}
async function categoriesList(env) {
  if (!env.DB) return json(DEFAULT_CATEGORIES);
  const r = await env.DB.prepare('SELECT id,name,tag,descr,icon,options,sort, LENGTH(image) AS imglen FROM categories WHERE active=1 ORDER BY sort, rowid').all();
  const list = (r.results || []).map(rowToCategory);
  return json(list.length ? list : DEFAULT_CATEGORIES);
}
async function categoryUpsert(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const c = await request.json().catch(() => null);
  if (!c || !c.id || !c.name) return json({ error: 'Categorie incompletă (id și nume obligatorii).' }, 400);
  const id = String(c.id).trim().toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!id) return json({ error: 'ID invalid.' }, 400);
  const name = String(c.name).trim(), tag = c.tag || null, descr = c.desc || null,
    icon = c.icon || 'accesoriu', opts = JSON.stringify(Array.isArray(c.options) ? c.options : []), sort = Number(c.sort) || 0;
  // UPDATE dacă există (păstrează poza), altfel INSERT.
  const exists = await env.DB.prepare('SELECT 1 FROM categories WHERE id=?').bind(id).first();
  if (exists) {
    await env.DB.prepare('UPDATE categories SET name=?,tag=?,descr=?,icon=?,options=?,sort=?,active=1 WHERE id=?')
      .bind(name, tag, descr, icon, opts, sort, id).run();
  } else {
    await env.DB.prepare('INSERT INTO categories (id,name,tag,descr,icon,options,sort,active) VALUES (?,?,?,?,?,?,?,1)')
      .bind(id, name, tag, descr, icon, opts, sort).run();
  }
  return json({ ok: true, id });
}
async function categoryImageServe(env, id) {
  if (!env.DB) return new Response('Not found', { status: 404 });
  const row = await env.DB.prepare('SELECT image FROM categories WHERE id=?').bind(id).first();
  const dec = row && row.image ? decodeDataUrl(row.image) : null;
  if (!dec) return new Response('Not found', { status: 404 });
  return new Response(dec.bytes, { headers: { 'Content-Type': dec.mime || 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
async function categoryImageUpsert(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => null);
  if (!v || !v.data) return json({ error: 'Lipsește imaginea.' }, 400);
  if (String(v.data).length > 4200000) return json({ error: 'Imagine prea mare (max ~3 MB).' }, 413);
  const r = await env.DB.prepare('UPDATE categories SET image=? WHERE id=?').bind(v.data, id).run();
  return json({ ok: true });
}
async function categoryImageDelete(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('UPDATE categories SET image=NULL WHERE id=?').bind(id).run();
  return json({ ok: true });
}
async function categoryDelete(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE cat=? AND active=1').bind(id).first();
  if (used && used.n) return json({ error: `Categoria are ${used.n} produse. Mută-le în altă categorie înainte de ștergere.` }, 409);
  await env.DB.prepare('DELETE FROM categories WHERE id=?').bind(id).run();
  return json({ ok: true });
}
async function categoryMoveProducts(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const { from, to } = await request.json().catch(() => ({}));
  if (!from || !to) return json({ error: 'Alege categoria sursă și destinație.' }, 400);
  if (from === to) return json({ error: 'Sursa și destinația sunt identice.' }, 400);
  const dest = await env.DB.prepare('SELECT 1 FROM categories WHERE id=?').bind(to).first();
  if (!dest) return json({ error: 'Categoria destinație nu există.' }, 404);
  const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE cat=?').bind(from).first();
  await env.DB.prepare('UPDATE products SET cat=? WHERE cat=?').bind(to, from).run();
  return json({ ok: true, moved: (cnt && cnt.n) || 0 });
}
async function categoriesReorder(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const { order } = await request.json().catch(() => ({ order: [] }));
  let sort = 0;
  for (const id of (order || [])) {
    await env.DB.prepare('UPDATE categories SET sort=? WHERE id=?').bind(sort++, id).run();
  }
  return json({ ok: true });
}
async function optionsList(env) {
  if (!env.DB) return json({});
  const r = await env.DB.prepare('SELECT * FROM option_values ORDER BY grp, sort, rowid').all();
  const out = {};
  for (const row of (r.results || [])) {
    (out[row.grp] = out[row.grp] || []);
    const v = { id: row.id, name: row.name, delta: row.delta || 0 };
    if (row.hex) v.hex = row.hex;
    out[row.grp].push(v);
  }
  return json(out);
}
async function optionUpsert(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => null);
  if (!v || !v.grp || !v.id || !v.name) return json({ error: 'Date incomplete.' }, 400);
  await env.DB.prepare('INSERT OR REPLACE INTO option_values (grp,id,name,delta,hex,sort) VALUES (?,?,?,?,?,?)')
    .bind(v.grp, v.id, v.name, Number(v.delta) || 0, v.hex || null, Number(v.sort) || 0).run();
  return json({ ok: true });
}
async function optionDelete(request, env, grp, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('DELETE FROM option_values WHERE grp=? AND id=?').bind(grp, id).run();
  return json({ ok: true });
}
async function optionsSeed(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const { options } = await request.json().catch(() => ({ options: {} }));
  let n = 0;
  for (const grp of Object.keys(options || {})) {
    let sort = 0;
    for (const v of options[grp]) {
      await env.DB.prepare('INSERT OR REPLACE INTO option_values (grp,id,name,delta,hex,sort) VALUES (?,?,?,?,?,?)')
        .bind(grp, v.id, v.name, Number(v.delta) || 0, v.hex || null, sort++).run();
      n++;
    }
  }
  return json({ ok: true, imported: n });
}

// ── Recenzii clienți ──
function rowToReview(r) {
  return { id: r.id, author: r.author, rating: r.rating, text: r.text, source: r.source || 'Google', sort: r.sort || 0, active: !!r.active };
}
async function reviewsList(request, env, url) {
  if (!env.DB) return json([]);
  if (url.searchParams.get('all')) {
    if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
    const r = await env.DB.prepare('SELECT * FROM reviews ORDER BY sort, id DESC').all();
    return json((r.results || []).map(rowToReview));
  }
  const r = await env.DB.prepare('SELECT * FROM reviews WHERE active=1 ORDER BY sort, id DESC').all();
  return json((r.results || []).map(rowToReview));
}
async function reviewUpsert(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => null);
  if (!v || !v.author || !v.text) return json({ error: 'Completează autor și text.' }, 400);
  const rating = Math.max(1, Math.min(5, Number(v.rating) || 5));
  const active = v.active === false ? 0 : 1;
  if (v.id) {
    await env.DB.prepare('UPDATE reviews SET author=?,rating=?,text=?,source=?,sort=?,active=? WHERE id=?')
      .bind(v.author, rating, v.text, v.source || 'Google', Number(v.sort) || 0, active, v.id).run();
    return json({ ok: true, id: v.id });
  }
  const res = await env.DB.prepare('INSERT INTO reviews (author,rating,text,source,sort,active) VALUES (?,?,?,?,?,?)')
    .bind(v.author, rating, v.text, v.source || 'Google', Number(v.sort) || 0, active).run();
  return json({ ok: true, id: res.meta ? res.meta.last_row_id : undefined });
}
async function reviewDelete(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('DELETE FROM reviews WHERE id=?').bind(id).run();
  return json({ ok: true });
}

// ── Setări site (logo + date de contact) ──
// Chei expuse public prin GET /api/settings (allowlist — orice cheie nouă rămâne privată implicit)
const PUBLIC_SETTINGS = ['logo', 'brandName', 'phone', 'email', 'email2', 'schedule', 'address', 'company_name', 'company_cui', 'company_reg', 'company_seat', 'facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp',
  'about_title', 'about_lead', 'about_story_title', 'about_story', 'about_mission', 'terms_title', 'terms_content', 'howto_title', 'howto_content',
  'livrare_title', 'livrare_content', 'privacy_title', 'privacy_content', 'cookies_title', 'cookies_content', 'faq_title', 'faq_content',
  'servicii_title', 'servicii_lead', 'servicii_image', 'servicii_montaj_title', 'servicii_montaj_content', 'servicii_consult_title', 'servicii_consult_content', 'servicii_cta_title', 'servicii_cta_text',
  'chatbot_enabled', 'chatbot_greeting', 'chatbot_teaser', 'chatbot_suggestions', 'chatbot_provider', 'chatbot_model', 'chatbot_prompt',
  'seo_default_desc', 'seo_areas', 'coming_soon', 'coming_soon_title', 'coming_soon_text',
  'ga4_id', 'gtm_id', 'meta_pixel', 'gsc_verification', 'head_code', 'body_code', 'nav'];
async function settingsGet(env) {
  if (!env.DB) return json({});
  const r = await env.DB.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const row of (r.results || [])) if (PUBLIC_SETTINGS.includes(row.key)) out[row.key] = row.value;
  return json(out);
}
async function settingsSave(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Date invalide.' }, 400);
  for (const [k, v] of Object.entries(body)) {
    const val = v == null ? '' : String(v);
    if (val.length > 3000000) return json({ error: 'Valoare prea mare pentru „' + k + '".' }, 413);
    await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)').bind(k, val).run();
  }
  return json({ ok: true });
}

// ── Chatbot AI (Grok / xAI) ────────────────────────────────────────────────
// Proxy server-side către api.x.ai. Cheia stă în env.XAI_API_KEY (secret pe
// Cloudflare), nu ajunge niciodată în browser. Promptul/modelul se pot edita
// din admin (chei private, ne-expuse prin GET /api/settings).
const CHAT_DEFAULT_PROMPT = `Ești asistentul virtual al magazinului ExpoTigla (ExpoTigla by Comstore), specializat în sisteme complete de acoperiș: țiglă metalică, tablă fălțuită, panouri sandwich, sisteme pluviale, folii și membrane, borduri și tinichigerie, ventilații, șuruburi și accesorii. Oferim și montaj profesional și consultanță tehnică gratuită.
Răspunde politicos, concis și clar, în limba română. Ajută clientul să aleagă produsul potrivit, explică diferențele dintre finisaje/culori/grosimi și îndrumă spre pagina de contact pentru ofertă personalizată sau montaj.
Nu inventa prețuri exacte sau stocuri — pentru prețuri și disponibilitate recomandă cererea de ofertă sau contactarea echipei. Dacă întrebarea nu ține de acoperișuri sau de magazin, redirecționează politicos discuția către subiectul acoperișurilor.`;
// Ghid de pagini + format link (mereu adăugat, indiferent de promptul personalizat).
const CHAT_PAGES_GUIDE = `Oferă butoane de navigare folosind EXACT formatul markdown [Text buton](adresa). Pagini: toate produsele → produse.html ; Montaj și consultanță → servicii.html ; Cerere ofertă / Contact → contact.html ; Branduri → branduri.html ; Ghidul acoperișului → blog.html. Categorii: Țiglă metalică → produse.html?cat=tigla-metalica ; Tablă fălțuită → produse.html?cat=tabla-faltuita ; Panouri sandwich → produse.html?cat=panouri-sandwich ; Sisteme pluviale → produse.html?cat=sistem-pluvial ; Folii și membrane → produse.html?cat=folii-membrane ; Borduri și tinichigerie → produse.html?cat=borduri ; Ventilații → produse.html?cat=ventilatii ; Șuruburi → produse.html?cat=suruburi ; Accesorii → produse.html?cat=accesorii. Folosește doar aceste adrese; nu inventa alte linkuri.`;
// Comportament de consilier: pune întrebări, apoi recomandă produse concrete.
const CHAT_BEHAVIOR = `MOD DE LUCRU (consilier): dacă cererea clientului e vagă (ex. „vreau țiglă", „ce-mi trebuie la acoperiș"), pune ÎNTÂI 1–2 întrebări scurte ca să înțelegi nevoia — de exemplu: tipul clădirii (casă/hală/anexă), suprafața aproximativă a acoperișului, bugetul orientativ, aspectul/culoarea dorită și dacă vrea și montaj. Maxim 2 întrebări odată, nu copleși clientul.
Când ai suficiente detalii (sau cererea e deja clară), recomandă 1–3 PRODUSE CONCRETE din catalogul de mai jos, fiecare cu link direct: [Numele produsului](produs.html?id=COD), plus o frază scurtă de ce se potrivește. Recomandă DOAR produse care există în catalog; nu inventa produse, coduri sau prețuri. Dacă nu găsești ceva potrivit, propune categoria relevantă și cererea de ofertă.`;
// Catalog compact pentru recomandări (cache 5 min).
let CATALOG_CACHE = null, CATALOG_TS = 0;
const CHAT_CAT_NAMES = { 'tigla-metalica': 'Țiglă metalică', 'tabla-faltuita': 'Tablă fălțuită', 'panouri-sandwich': 'Panouri sandwich', 'sistem-pluvial': 'Sisteme pluviale', 'folii-membrane': 'Folii și membrane', 'borduri': 'Borduri și tinichigerie', 'ventilatii': 'Ventilații acoperiș', 'suruburi': 'Șuruburi', 'accesorii': 'Accesorii' };
// Trimitem catalogul doar când clientul întreabă despre produse/prețuri/recomandări.
const CHAT_CATALOG_KW = /(produs|pret|preț|cost|recomand|model|culoar|grosim|finisaj|tigl|țigl|tabl|panou|sandwich|jgheab|burlan|pluvial|folie|membran|surub|șurub|accesor|ventilat|bordur|coam|acoperi|mp\b|metri|ofert|catalog|stoc|disponibil|ieftin|scump|buget)/i;
function chatNeedsCatalog(msgs) {
  const recent = msgs.filter(m => m.role === 'user').slice(-2).map(m => m.content).join(' ');
  return CHAT_CATALOG_KW.test(recent);
}
async function getCatalogContext(env) {
  const now = Date.now();
  if (CATALOG_CACHE !== null && now - CATALOG_TS < 300000) return CATALOG_CACHE;
  let out = '';
  try {
    const r = await env.DB.prepare('SELECT id, name, cat, price, unit, producator FROM products WHERE active=1 ORDER BY cat, name').all();
    // Format compact (mai puțini tokens): cod|denumire brand|categorie|preț
    out = (r.results || []).slice(0, 240).map(p => {
      const cat = CHAT_CAT_NAMES[p.cat] || p.cat || '';
      const pr = p.price ? `${p.price}lei/${p.unit || 'buc'}` : 'la cerere';
      const br = p.producator ? ' ' + p.producator : '';
      return `${p.id}|${p.name}${br}|${cat}|${pr}`;
    }).join('\n');
  } catch (e) { out = ''; }
  CATALOG_CACHE = out; CATALOG_TS = now;
  return out;
}
// Furnizori AI compatibili OpenAI. Cheia se ia din env (secret pe Cloudflare).
const CHAT_PROVIDERS = {
  // Pentru Groq acceptăm și greșeala frecventă GROK_API_KEY (cu K) și un AI_API_KEY generic.
  // `fallbacks` = modele curente încercate dacă cel configurat e scos din uz (Groq retrage des modele).
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', keys: ['GROQ_API_KEY', 'GROK_API_KEY', 'AI_API_KEY'], fallbacks: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'] },
  xai: { url: 'https://api.x.ai/v1/chat/completions', model: 'grok-3', keys: ['XAI_API_KEY', 'GROK_API_KEY', 'AI_API_KEY'], fallbacks: ['grok-3', 'grok-2-1212'] },
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-flash-latest', keys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'AI_API_KEY'], fallbacks: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'] },
};
async function chatHandler(request, env) {
  const body = await request.json().catch(() => null);
  let msgs = body && Array.isArray(body.messages) ? body.messages : null;
  if (!msgs) return json({ error: 'Mesaje lipsă.' }, 400);
  msgs = msgs.filter(mm => mm && (mm.role === 'user' || mm.role === 'assistant') && typeof mm.content === 'string' && mm.content.trim())
    .slice(-6).map(mm => ({ role: mm.role, content: mm.content.slice(0, 1200) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'Mesaj invalid.' }, 400);
  // Setări (provider/prompt/model + contact)
  let s = {};
  try {
    const r = await env.DB.prepare(`SELECT key,value FROM settings WHERE key IN ('chatbot_provider','chatbot_prompt','chatbot_model','phone','email','schedule')`).all();
    for (const row of (r.results || [])) if (row.value) s[row.key] = row.value;
  } catch (e) { /* fără DB → implicit */ }
  const prov = CHAT_PROVIDERS[s.chatbot_provider] || CHAT_PROVIDERS.groq;
  let key = '';
  for (const k of prov.keys) { if (env[k]) { key = env[k]; break; } }
  if (!key) return json({ error: 'Chatbotul nu este configurat pe server (lipsește cheia ' + prov.keys[0] + ').' }, 503);
  let system = (s.chatbot_prompt && s.chatbot_prompt.trim()) ? s.chatbot_prompt : CHAT_DEFAULT_PROMPT;
  const contact = [];
  if (s.phone) contact.push('telefon ' + s.phone);
  if (s.email) contact.push('email ' + s.email);
  if (s.schedule) contact.push('program ' + s.schedule);
  if (contact.length) system += `\n\nDate de contact ale magazinului: ${contact.join(', ')}. Pagina de contact/ofertă: contact.html.`;
  system += `\n\n${CHAT_PAGES_GUIDE}\n\n${CHAT_BEHAVIOR}`;
  // Catalogul (mare) se trimite DOAR când conversația e despre produse — economisește tokens.
  if (chatNeedsCatalog(msgs)) {
    const catalog = await getCatalogContext(env);
    if (catalog) system += `\n\nCATALOG (format: cod|denumire brand|categorie|preț — folosește doar de aici; link produs = produs.html?id=COD):\n${catalog}`;
  }
  const model = (s.chatbot_model && s.chatbot_model.trim()) || prov.model;
  // Încearcă modelul configurat, apoi modelele curente de rezervă dacă cel ales e scos din uz.
  const tryModels = [model];
  for (const fm of (prov.fallbacks || [])) if (fm && !tryModels.includes(fm)) tryModels.push(fm);
  const payload = { model, temperature: 0.4, max_tokens: 420, stream: false,
    messages: [{ role: 'system', content: system }, ...msgs] };
  let r = null, lastStatus = 0, lastDetail = '';
  for (const mdl of tryModels) {
    payload.model = mdl;
    try {
      r = await fetch(prov.url, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) { return json({ error: 'Nu am putut contacta serviciul de chat.' }, 502); }
    if (r.ok) break;
    lastStatus = r.status; lastDetail = (await r.text().catch(() => '')).slice(0, 400);
    // Încearcă alt model dacă cel curent nu mai există (404 / model_not_found) SAU
    // dacă furnizorul e temporar suprasolicitat (503 overloaded) — alt model poate
    // răspunde. Pentru 429 (limită) / 401 / 403 (cheie) ne oprim — nu ajută alt model.
    const retryable = r.status === 404 || r.status === 503
      || /model_not_found|does not exist|has been decommissioned|decommission|overloaded|unavailable/i.test(lastDetail);
    if (!retryable) break;
  }
  if (!r || !r.ok) {
    const provLabel = { groq: 'Groq', gemini: 'Google Gemini', xai: 'Grok/xAI' }[s.chatbot_provider] || (s.chatbot_provider || 'Groq');
    const keyName = (prov.keys && prov.keys[0]) || 'cheia API';
    let msg;
    if (lastStatus === 429) msg = 'Limită de utilizare atinsă (429). Ai depășit cota gratuită ' + provLabel + ' (pe minut sau zilnică) — reîncearcă peste câteva minute. Pentru volum mai mare, comută pe alt furnizor gratuit (ex. Google Gemini, cu limite mai mari) din tab-ul Chatbot, sau treci pe un plan plătit.';
    else if (lastStatus === 401 || lastStatus === 403) msg = 'Cheia API a fost respinsă (' + lastStatus + '). Verifică ' + keyName + ' în Cloudflare.';
    else if (lastStatus === 503 || /overloaded|unavailable/i.test(lastDetail)) msg = 'Serviciul AI e temporar suprasolicitat. Încearcă din nou în câteva secunde.';
    else if (lastStatus === 404 || /model_not_found|does not exist|decommission/i.test(lastDetail)) msg = 'Modelul configurat nu mai există — schimbă-l în tab-ul Chatbot.';
    else msg = 'Serviciul de chat a returnat eroare (' + (lastStatus || '?') + ').';
    return json({ error: msg, detail: lastDetail }, 502);
  }
  const data = await r.json().catch(() => null);
  const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!reply) return json({ error: 'Răspuns gol de la serviciul de chat.' }, 502);
  // Logăm schimbul (ultimul mesaj al clientului + răspunsul) pentru istoricul din admin.
  const sid = (body.session_id && /^[a-zA-Z0-9_-]{6,64}$/.test(body.session_id)) ? body.session_id : null;
  if (sid && env.DB) {
    try {
      await env.DB.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?,?,?)').bind(sid, 'user', msgs[msgs.length - 1].content).run();
      await env.DB.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?,?,?)').bind(sid, 'assistant', reply).run();
    } catch (e) { /* logarea nu trebuie să blocheze răspunsul */ }
  }
  return json({ reply });
}
async function chatLogsList(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare(
    `SELECT session_id,
       COUNT(*) AS n,
       MAX(created_at) AS last_at,
       MIN(created_at) AS first_at,
       (SELECT content FROM chat_messages m2 WHERE m2.session_id=m.session_id AND m2.role='user' ORDER BY id LIMIT 1) AS preview
     FROM chat_messages m
     GROUP BY session_id
     ORDER BY last_at DESC
     LIMIT 300`).all();
  return json((r.results || []).map(x => ({
    session_id: x.session_id, count: x.n, last_at: x.last_at, first_at: x.first_at,
    preview: (x.preview || '').slice(0, 120),
  })));
}
async function chatLogGet(request, env, sid) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT role, content, created_at FROM chat_messages WHERE session_id=? ORDER BY id').bind(sid).all();
  return json(r.results || []);
}
async function chatLogDelete(request, env, sid) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  if (sid === '__all__') await env.DB.prepare('DELETE FROM chat_messages').run();
  else await env.DB.prepare('DELETE FROM chat_messages WHERE session_id=?').bind(sid).run();
  return json({ ok: true });
}

// ── Producători (nume + logo) ──
function rowToProducer(r) { return { id: r.id, name: r.name, logo: r.logo || '', sort: r.sort || 0 }; }
async function producersList(env) {
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT * FROM producers ORDER BY sort, name').all();
  return json((r.results || []).map(rowToProducer));
}
async function producerUpsert(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => null);
  if (!v || !v.name) return json({ error: 'Adaugă numele producătorului.' }, 400);
  if (typeof v.logo === 'string' && v.logo.length > 2000000) return json({ error: 'Logo prea mare.' }, 413);
  const id = v.id || v.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('p' + Date.now());
  await env.DB.prepare('INSERT OR REPLACE INTO producers (id, name, logo, sort) VALUES (?,?,?,?)').bind(id, v.name, v.logo || '', Number(v.sort) || 0).run();
  return json({ ok: true, id });
}
async function producerDelete(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('DELETE FROM producers WHERE id=?').bind(id).run();
  return json({ ok: true });
}

// ── Blog (articole) ──
function rowToPost(r, withContent) {
  const o = { id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt || '', image: r.image || '', active: !!r.active, created_at: r.created_at };
  if (withContent) o.content = r.content || '';
  return o;
}
async function postsList(request, env, url) {
  if (!env.DB) return json([]);
  if (url.searchParams.get('all')) {
    if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
    const r = await env.DB.prepare('SELECT * FROM posts ORDER BY id DESC').all();
    return json((r.results || []).map(x => rowToPost(x, true)));
  }
  const r = await env.DB.prepare('SELECT id,slug,title,excerpt,image,active,created_at FROM posts WHERE active=1 ORDER BY id DESC').all();
  return json((r.results || []).map(x => rowToPost(x, false)));
}
async function postGet(env, slug) {
  if (!env.DB) return json({ error: 'Indisponibil.' }, 404);
  const r = await env.DB.prepare('SELECT * FROM posts WHERE slug=? AND active=1').bind(slug).first();
  if (!r) return json({ error: 'Articol inexistent.' }, 404);
  return json(rowToPost(r, true));
}
async function postUpsert(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => null);
  if (!v || !v.title) return json({ error: 'Adaugă un titlu.' }, 400);
  if (typeof v.image === 'string' && v.image.length > 2000000) return json({ error: 'Imaginea de copertă e prea mare.' }, 413);
  const slug = (v.slug || v.title).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('a' + Date.now());
  const active = v.active === false ? 0 : 1;
  if (v.id) {
    await env.DB.prepare('UPDATE posts SET slug=?,title=?,excerpt=?,content=?,image=?,active=? WHERE id=?')
      .bind(slug, v.title, v.excerpt || '', v.content || '', v.image || '', active, v.id).run();
    return json({ ok: true, id: v.id, slug });
  }
  const res = await env.DB.prepare('INSERT INTO posts (slug,title,excerpt,content,image,active) VALUES (?,?,?,?,?,?)')
    .bind(slug, v.title, v.excerpt || '', v.content || '', v.image || '', active).run();
  return json({ ok: true, id: res.meta ? res.meta.last_row_id : undefined, slug });
}
async function postDelete(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id).run();
  return json({ ok: true });
}

// ── Bannere hero (editabile din admin) ──
// Admin: obiectul include data URL-ul complet (pentru preview/editare).
function rowToBanner(r) {
  return { id: r.id, title: r.title || '', subtitle: r.subtitle || '', ctaLabel: r.cta_label || '', ctaHref: r.cta_href || '', image: r.image || '', imageMobile: r.image_mobile || '', align: r.align || 'left', height: r.height || 'md', sort: r.sort || 0, active: !!r.active };
}
// Public: imaginea NU se trimite ca base64 în JSON, ci ca URL către un endpoint
// binar cache-uibil. Astfel JSON-ul e mic și imaginea se încarcă rapid + cache.
function rowToBannerPublic(r) {
  const b = rowToBanner(r);
  b.image = r.image ? `/api/banners/${r.id}/image?v=${r.image.length}` : '';
  b.imageMobile = r.image_mobile ? `/api/banners/${r.id}/image-mobile?v=${r.image_mobile.length}` : '';
  return b;
}
// Decodează un data URL („data:image/jpeg;base64,....") în { mime, bytes }
function decodeDataUrl(dataUrl) {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl || '');
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const data = m[3] || '';
  if (m[2]) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime, bytes };
  }
  return { mime, bytes: new TextEncoder().encode(decodeURIComponent(data)) };
}
// Servește imaginea unui banner ca fișier binar, cu cache lung (immutable).
// URL-ul conține ?v=<lungime>, deci se schimbă când imaginea se schimbă → fără cache stale.
async function bannerImage(env, id, mobile) {
  if (!env.DB) return new Response('Not found', { status: 404 });
  const col = mobile ? 'image_mobile' : 'image';
  const row = await env.DB.prepare(`SELECT ${col} AS img FROM banners WHERE id=?`).bind(id).first();
  const dec = row && row.img ? decodeDataUrl(row.img) : null;
  if (!dec) return new Response('Not found', { status: 404 });
  return new Response(dec.bytes, { headers: { 'Content-Type': dec.mime, 'Cache-Control': 'public, max-age=31536000, immutable' } });
}

// ── Fișiere produs (poză montaj + documente), stocate în D1, servite binar ──
const PRODUCT_FILE_KINDS = ['main', 'montaj', 'doc_fisa', 'doc_dop', 'doc_garantie', 'doc_montaj'];
async function productFilesList(env, pid) {
  if (!env.DB) return json([]);
  const r = await env.DB.prepare('SELECT kind, name, LENGTH(data) AS len FROM product_files WHERE product_id=?').bind(pid).all();
  return json((r.results || []).map(x => ({ kind: x.kind, name: x.name || '', url: `/api/pf/${encodeURIComponent(pid)}/${x.kind}?v=${x.len || 0}` })));
}
async function productFileServe(env, pid, kind) {
  if (!env.DB) return new Response('Not found', { status: 404 });
  const row = await env.DB.prepare('SELECT mime, data, name FROM product_files WHERE product_id=? AND kind=?').bind(pid, kind).first();
  const dec = row && row.data ? decodeDataUrl(row.data) : null;
  if (!dec) return new Response('Not found', { status: 404 });
  const headers = { 'Content-Type': dec.mime || row.mime || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' };
  if (kind.startsWith('doc_')) headers['Content-Disposition'] = `inline; filename="${String(row.name || kind).replace(/[^\w.\- ]/g, '_')}"`;
  return new Response(dec.bytes, { headers });
}
async function productFileUpsert(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => null);
  const validKind = v && (PRODUCT_FILE_KINDS.includes(v.kind) || /^color_[a-z0-9_\-]+$/i.test(v.kind || ''));
  if (!v || !v.product_id || !validKind || !v.data) return json({ error: 'Date lipsă sau tip invalid.' }, 400);
  if (String(v.data).length > 4200000) return json({ error: 'Fișier prea mare (max ~3 MB).' }, 413);
  await env.DB.prepare('INSERT OR REPLACE INTO product_files (product_id, kind, mime, data, name, updated_at) VALUES (?,?,?,?,?,datetime(\'now\'))')
    .bind(v.product_id, v.kind, v.mime || '', v.data, v.name || '').run();
  return json({ ok: true });
}
async function productFileDelete(request, env, pid, kind) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('DELETE FROM product_files WHERE product_id=? AND kind=?').bind(pid, kind).run();
  return json({ ok: true });
}

async function bannersList(request, env, url) {
  if (!env.DB) return json([]);
  if (url.searchParams.get('all')) {
    if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
    const r = await env.DB.prepare('SELECT * FROM banners ORDER BY sort, id DESC').all();
    return json((r.results || []).map(rowToBanner));
  }
  const r = await env.DB.prepare('SELECT * FROM banners WHERE active=1 ORDER BY sort, id DESC').all();
  return json((r.results || []).map(rowToBannerPublic));
}
async function bannerUpsert(request, env) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  const v = await request.json().catch(() => null);
  if (!v || !v.image) return json({ error: 'Adaugă o imagine pentru banner.' }, 400);
  if (typeof v.image === 'string' && v.image.length > 3000000) return json({ error: 'Imaginea e prea mare. Folosește una mai mică (max ~2 MB).' }, 413);
  if (typeof v.imageMobile === 'string' && v.imageMobile.length > 3000000) return json({ error: 'Imaginea pentru mobil e prea mare.' }, 413);
  const active = v.active === false ? 0 : 1;
  const align = ['left', 'center', 'right'].includes(v.align) ? v.align : 'left';
  const height = ['sm', 'md', 'lg'].includes(v.height) ? v.height : 'md';
  const imageMobile = v.imageMobile || '';
  if (v.id) {
    await env.DB.prepare('UPDATE banners SET title=?,subtitle=?,cta_label=?,cta_href=?,image=?,image_mobile=?,align=?,height=?,sort=?,active=? WHERE id=?')
      .bind(v.title || '', v.subtitle || '', v.ctaLabel || '', v.ctaHref || '', v.image, imageMobile, align, height, Number(v.sort) || 0, active, v.id).run();
    return json({ ok: true, id: v.id });
  }
  const res = await env.DB.prepare('INSERT INTO banners (title,subtitle,cta_label,cta_href,image,image_mobile,align,height,sort,active) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(v.title || '', v.subtitle || '', v.ctaLabel || '', v.ctaHref || '', v.image, imageMobile, align, height, Number(v.sort) || 0, active).run();
  return json({ ok: true, id: res.meta ? res.meta.last_row_id : undefined });
}
async function bannerDelete(request, env, id) {
  if (!await requireAdmin(request, env)) return json({ error: 'Neautorizat' }, 401);
  if (!env.DB) return json({ error: 'Baza de date nu este configurată.' }, 500);
  await env.DB.prepare('DELETE FROM banners WHERE id=?').bind(id).run();
  return json({ ok: true });
}

async function sendEmail(env, payload) {
  if (!env.RESEND_API_KEY) return { delivered: false, error: 'Email neconfigurat.' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: env.QUOTE_FROM || 'ExpoTigla <onboarding@resend.dev>', ...payload }),
    });
    return { delivered: r.ok, error: r.ok ? null : `Resend HTTP ${r.status}` };
  } catch (e) { return { delivered: false, error: String(e) }; }
}

// Constante de livrare (trebuie să corespundă cu cele din cos.html)
const DELIVERY_THRESHOLD = 2000, DELIVERY_FEE = 150;
// Taie un string la o lungime maximă (validare defensivă pe câmpurile din formulare)
const clip = (s, n) => (s == null ? '' : String(s)).slice(0, n);
// Prețul unitar calculat SERVER-SIDE din produsul din baza de date (nu din payload-ul clientului)
function serverUnitPrice(p, opts) {
  const o = opts || {};
  if (p.finishes && Array.isArray(p.finishes) && p.finishes.length) {
    const f = p.finishes.find(x => x.id === o.finisaj) || p.finishes[0];
    const key = (o.culoare || '') + '|' + (o.grosime || '');
    const v = f && f.prices ? f.prices[key] : undefined;
    return typeof v === 'number' ? v : (Number(p.price) || 0);
  }
  if (o.culoare && p.colorPrices && typeof p.colorPrices[o.culoare] === 'number') return p.colorPrices[o.culoare];
  return Number(p.price) || 0;
}

async function orderCreate(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'Date invalide.' }, 400);
  let { nume, prenume, telefon, email, adresa, oras, judet, obs, items } = body;
  if (!nume || !telefon || !adresa || !Array.isArray(items) || !items.length) return json({ ok: false, error: 'Date incomplete.' }, 400);
  if (items.length > 200) return json({ ok: false, error: 'Prea multe produse în comandă.' }, 400);
  // Validare de lungime pe câmpuri
  nume = clip(nume, 120); prenume = clip(prenume, 120); telefon = clip(telefon, 40);
  email = clip(email, 160); adresa = clip(adresa, 300); oras = clip(oras, 120); judet = clip(judet, 120); obs = clip(obs, 2000);
  // Tip client (persoană fizică / juridică) + date firmă
  const tipClient = body.tip_client === 'juridica' ? 'juridica' : 'fizica';
  const firma = tipClient === 'juridica' ? clip(body.firma, 160) : '';
  const cui = tipClient === 'juridica' ? clip(body.cui, 40) : '';
  const regCom = tipClient === 'juridica' ? clip(body.reg_com, 60) : '';
  if (tipClient === 'juridica' && (!firma || !cui)) return json({ ok: false, error: 'Pentru persoană juridică, denumirea firmei și CUI-ul sunt obligatorii.' }, 400);

  // Recalcul preț SERVER-SIDE: prețul din client e ignorat, folosim prețurile reale din DB.
  const priced = []; let subtotal = 0;
  for (const it of items) {
    const id = it && it.id ? String(it.id) : null;
    const qty = Math.max(1, Math.min(100000, parseInt(it && it.cant) || 1));
    let name = clip(it && it.nume, 200), unit = clip(it && it.unit, 20) || 'buc', pret = 0;
    if (id && env.DB) {
      const row = await env.DB.prepare('SELECT * FROM products WHERE id=? AND active=1').bind(id).first();
      if (row) { const p = rowToProduct(row); pret = serverUnitPrice(p, it && it.opts); name = p.name; unit = p.unit || unit; }
    }
    subtotal += pret * qty;
    priced.push({ nume: name, optiuni: clip(it && it.optiuni, 300), cant: qty, unit, pret });
  }
  const delivery = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;

  const ref = 'CMD-' + Date.now().toString().slice(-6);
  let saved = false;
  if (env.DB) {
    try {
      await env.DB.prepare(`INSERT INTO orders (ref,nume,prenume,telefon,email,adresa,oras,judet,obs,items,total,tip_client,firma,cui,reg_com) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(ref, nume, prenume || '', telefon, email || '', adresa, oras || '', judet || '', obs || '', JSON.stringify(priced), total, tipClient, firma, cui, regCom).run();
      saved = true;
    } catch (e) { console.error('DB order', e); }
  }
  const rows = priced.map(it => `<tr><td>${esc(it.nume)}${it.optiuni ? `<br><small>${esc(it.optiuni)}</small>` : ''}</td><td align="center">${esc(it.cant)} ${esc(it.unit || '')}</td><td align="right">${fmtLei(it.pret)}</td></tr>`).join('');
  const to = env.ORDER_TO_EMAIL || env.QUOTE_TO_EMAIL;
  let mail = { delivered: false };
  if (to) mail = await sendEmail(env, { to: [to], reply_to: email || undefined, subject: `Comandă ${ref} — ${prenume || ''} ${nume}`,
    html: `<h2>Comandă ${esc(ref)}</h2><p>${esc(prenume)} ${esc(nume)} · ${esc(telefon)} · ${esc(email)}<br>${esc(adresa)}, ${esc(oras)}, ${esc(judet)}</p>${tipClient === 'juridica' ? `<p><b>Persoană juridică:</b> ${esc(firma)} · CUI ${esc(cui)}${regCom ? ` · Reg. Com. ${esc(regCom)}` : ''}</p>` : '<p>Persoană fizică</p>'}<table border="1" cellpadding="6" style="border-collapse:collapse">${rows}</table><p>Subtotal: ${fmtLei(subtotal)} · Livrare: ${delivery ? fmtLei(delivery) : 'gratuită'}<br><b>Total: ${fmtLei(total)}</b> (ramburs)</p>` });
  // Fail loud: nu confirma o comandă care nu s-a înregistrat nicăieri.
  if (env.DB && !saved) return json({ ok: false, error: 'Nu am putut înregistra comanda. Te rugăm sună-ne pentru confirmare.' }, 500);
  if (!env.DB && !mail.delivered) return json({ ok: false, error: 'Comanda nu a putut fi înregistrată. Te rugăm contactează-ne telefonic.' }, 500);
  // Email de confirmare către CLIENT (best-effort; necesită RESEND_API_KEY + domeniu verificat)
  if (email && env.RESEND_API_KEY) {
    await sendEmail(env, { to: [email], subject: `Comanda ta ${ref} — ExpoTigla`,
      html: `<h2>Îți mulțumim pentru comandă, ${esc(prenume || nume)}!</h2>
        <p>Am înregistrat comanda <b>${esc(ref)}</b>. Iată rezumatul:</p>
        <table border="1" cellpadding="6" style="border-collapse:collapse">${rows}</table>
        <p>Subtotal: ${fmtLei(subtotal)} · Livrare: ${delivery ? fmtLei(delivery) : 'gratuită'}<br><b>Total de plată (ramburs): ${fmtLei(total)}</b></p>
        <p>Ce urmează: te contactăm în cel mai scurt timp la <b>${esc(telefon)}</b> pentru confirmare și programarea livrării. Plata se face ramburs, la livrare.</p>
        <p>Ai întrebări? Răspunde la acest email.<br>— Echipa ExpoTigla</p>` });
  }
  return json({ ok: true, ref, total, delivered: mail.delivered });
}

async function quoteCreate(request, env) {
  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'Date invalide.' }, 400); }
  const g = (k, n) => clip((form.get(k) || '').toString().trim(), n);
  const nume = g('nume', 120), telefon = g('telefon', 40), email = g('email', 160),
    tip = g('tip', 80), suprafata = g('suprafata', 40), mesaj = g('mesaj', 3000);
  if (!nume || !telefon || !email || !mesaj) return json({ ok: false, error: 'Completează câmpurile obligatorii.' }, 400);
  const tipClient = form.get('tip_client') === 'juridica' ? 'juridica' : 'fizica';
  const firma = tipClient === 'juridica' ? g('firma', 160) : '';
  const cui = tipClient === 'juridica' ? g('cui', 40) : '';
  const regCom = tipClient === 'juridica' ? g('reg_com', 60) : '';
  if (tipClient === 'juridica' && (!firma || !cui)) return json({ ok: false, error: 'Pentru persoană juridică, denumirea firmei și CUI-ul sunt obligatorii.' }, 400);
  const file = form.get('plan');
  let attachment = null, planInfo = 'Fără plan atașat.';
  if (file && typeof file === 'object' && file.size > 0) {
    if (file.size > 15 * 1024 * 1024) return json({ ok: false, error: 'Fișierul depășește 15 MB.' }, 413);
    const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'dwg', 'dxf', 'doc', 'docx'];
    const ext = (file.name || '').split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) return json({ ok: false, error: 'Tip de fișier neacceptat. Acceptăm: ' + allowed.join(', ') + '.' }, 415);
    attachment = { filename: clip(file.name || 'plan', 200), content: toBase64(await file.arrayBuffer()) };
    planInfo = `${clip(file.name, 200)} (${(file.size / 1048576).toFixed(2)} MB)`;
  }
  const ref = 'OF-' + Date.now().toString().slice(-6);
  let saved = false;
  if (env.DB) {
    try {
      await env.DB.prepare(`INSERT INTO quotes (ref,nume,telefon,email,tip,suprafata,mesaj,plan,tip_client,firma,cui,reg_com) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(ref, nume, telefon, email, tip, suprafata, mesaj, planInfo, tipClient, firma, cui, regCom).run();
      saved = true;
    } catch (e) { console.error('DB quote', e); }
  }
  const to = env.QUOTE_TO_EMAIL;
  let mail = { delivered: false };
  if (to) {
    const payload = { to: [to], reply_to: email, subject: `Cerere ofertă ${ref} — ${nume}`,
      html: `<h2>Cerere ofertă ${esc(ref)}</h2><p>${esc(nume)} · ${esc(telefon)} · ${esc(email)}</p>${tipClient === 'juridica' ? `<p><b>Persoană juridică:</b> ${esc(firma)} · CUI ${esc(cui)}${regCom ? ` · Reg. Com. ${esc(regCom)}` : ''}</p>` : '<p>Persoană fizică</p>'}<p>Tip: ${esc(tip)} · ${esc(suprafata)} mp · Plan: ${esc(planInfo)}</p><p>${esc(mesaj)}</p>` };
    if (attachment) payload.attachments = [attachment];
    mail = await sendEmail(env, payload);
  }
  if (env.DB && !saved && !mail.delivered) return json({ ok: false, error: 'Nu am putut înregistra cererea. Te rugăm sună-ne.' }, 500);
  // Confirmare către CLIENT (best-effort; necesită RESEND_API_KEY + domeniu verificat)
  if (email && env.RESEND_API_KEY) {
    await sendEmail(env, { to: [email], subject: `Am primit cererea ta ${ref} — ExpoTigla`,
      html: `<h2>Îți mulțumim, ${esc(nume)}!</h2>
        <p>Am primit cererea ta cu numărul <b>${esc(ref)}</b>. Un consultant ExpoTigla te va contacta în <b>maxim 24 de ore</b> pentru detalii și ofertă.</p>
        <p>Dacă e ceva urgent, ne poți suna direct.<br>Ai întrebări? Poți răspunde la acest email.<br>— Echipa ExpoTigla</p>` });
  }
  return json({ ok: true, ref });
}

/* ── Router ────────────────────────────────────────────────────────────── */
async function api(request, env, url) {
  const p = url.pathname, m = request.method;
  await ensureSchema(env);
  if (p === '/api/admin/login' && m === 'POST') return login(request, env);
  if (p === '/api/products' && m === 'GET') return productsList(env);
  if (p === '/api/products' && m === 'POST') return productsCreate(request, env);
  // Fișiere produs (poză montaj + documente)
  const pfServe = p.match(/^\/api\/pf\/([^/]+)\/([\w-]+)$/);
  if (pfServe && m === 'GET') return productFileServe(env, decodeURIComponent(pfServe[1]), pfServe[2]);
  const pfList = p.match(/^\/api\/pf\/([^/]+)$/);
  if (pfList && m === 'GET') return productFilesList(env, decodeURIComponent(pfList[1]));
  if (p === '/api/product-files' && m === 'POST') return productFileUpsert(request, env);
  const pfDel = p.match(/^\/api\/product-files\/([^/]+)\/([\w-]+)$/);
  if (pfDel && m === 'DELETE') return productFileDelete(request, env, decodeURIComponent(pfDel[1]), pfDel[2]);
  const pid = p.match(/^\/api\/products\/(.+)$/);
  if (pid && m === 'PUT') return productUpdate(request, env, decodeURIComponent(pid[1]));
  if (pid && m === 'DELETE') return productDelete(request, env, decodeURIComponent(pid[1]));
  if (p === '/api/admin/seed' && m === 'POST') return seed(request, env);
  if (p === '/api/options' && m === 'GET') return optionsList(env);
  if (p === '/api/options' && m === 'POST') return optionUpsert(request, env);
  if (p === '/api/options/seed' && m === 'POST') return optionsSeed(request, env);
  const ov = p.match(/^\/api\/options\/([^/]+)\/(.+)$/);
  if (ov && m === 'DELETE') return optionDelete(request, env, decodeURIComponent(ov[1]), decodeURIComponent(ov[2]));
  if (p === '/api/categories' && m === 'GET') return categoriesList(env);
  if (p === '/api/categories' && m === 'POST') return categoryUpsert(request, env);
  if (p === '/api/categories/reorder' && m === 'POST') return categoriesReorder(request, env);
  if (p === '/api/categories/move-products' && m === 'POST') return categoryMoveProducts(request, env);
  const catImg = p.match(/^\/api\/categories\/([^/]+)\/image$/);
  if (catImg && m === 'GET') return categoryImageServe(env, decodeURIComponent(catImg[1]));
  if (catImg && m === 'POST') return categoryImageUpsert(request, env, decodeURIComponent(catImg[1]));
  if (catImg && m === 'DELETE') return categoryImageDelete(request, env, decodeURIComponent(catImg[1]));
  const catDel = p.match(/^\/api\/categories\/(.+)$/);
  if (catDel && m === 'DELETE') return categoryDelete(request, env, decodeURIComponent(catDel[1]));
  if (p === '/api/admins' && m === 'GET') return adminsList(request, env);
  if (p === '/api/admins' && m === 'POST') return adminUpsert(request, env);
  const adm = p.match(/^\/api\/admins\/(.+)$/);
  if (adm && m === 'DELETE') return adminDelete(request, env, decodeURIComponent(adm[1]));
  if (p === '/api/posts' && m === 'GET') return postsList(request, env, url);
  if (p === '/api/posts' && m === 'POST') return postUpsert(request, env);
  const pm = p.match(/^\/api\/posts\/(.+)$/);
  if (pm && m === 'GET') return postGet(env, decodeURIComponent(pm[1]));
  if (pm && m === 'DELETE') return postDelete(request, env, Number(pm[1]));
  if (p === '/api/settings' && m === 'GET') return settingsGet(env);
  if (p === '/api/settings' && m === 'POST') return settingsSave(request, env);
  if (p === '/api/chat' && m === 'POST') return chatHandler(request, env);
  if (p === '/api/chat-logs' && m === 'GET') return chatLogsList(request, env);
  const clg = p.match(/^\/api\/chat-logs\/(.+)$/);
  if (clg && m === 'GET') return chatLogGet(request, env, decodeURIComponent(clg[1]));
  if (clg && m === 'DELETE') return chatLogDelete(request, env, decodeURIComponent(clg[1]));
  if (p === '/api/producers' && m === 'GET') return producersList(env);
  if (p === '/api/producers' && m === 'POST') return producerUpsert(request, env);
  const pr = p.match(/^\/api\/producers\/(.+)$/);
  if (pr && m === 'DELETE') return producerDelete(request, env, decodeURIComponent(pr[1]));
  if (p === '/api/banners' && m === 'GET') return bannersList(request, env, url);
  if (p === '/api/banners' && m === 'POST') return bannerUpsert(request, env);
  const bimg = p.match(/^\/api\/banners\/(\d+)\/(image|image-mobile)$/);
  if (bimg && m === 'GET') return bannerImage(env, Number(bimg[1]), bimg[2] === 'image-mobile');
  const bn = p.match(/^\/api\/banners\/(\d+)$/);
  if (bn && m === 'DELETE') return bannerDelete(request, env, Number(bn[1]));
  if (p === '/api/reviews' && m === 'GET') return reviewsList(request, env, url);
  if (p === '/api/reviews' && m === 'POST') return reviewUpsert(request, env);
  const rv = p.match(/^\/api\/reviews\/(\d+)$/);
  if (rv && m === 'DELETE') return reviewDelete(request, env, Number(rv[1]));
  if (p === '/api/orders' && m === 'GET') return ordersList(request, env);
  const osm = p.match(/^\/api\/orders\/(\d+)\/status$/);
  if (osm && (m === 'PUT' || m === 'POST')) return orderStatusUpdate(request, env, Number(osm[1]));
  // Diagnostic email (admin)
  if (p === '/api/admin/mailcheck' && m === 'GET') return mailCheck(request, env);
  if (p === '/api/admin/mail-test' && m === 'POST') return mailTest(request, env);
  // Diagnostic chatbot (admin)
  if (p === '/api/admin/chat-test' && m === 'POST') return chatTest(request, env);
  // Conturi clienți
  if (p === '/api/account/register' && m === 'POST') return accountRegister(request, env);
  if (p === '/api/account/login' && m === 'POST') return accountLogin(request, env);
  if (p === '/api/account/me' && m === 'GET') return accountMe(request, env);
  if (p === '/api/account/orders' && m === 'GET') return accountOrders(request, env);
  if (p === '/api/quotes' && m === 'GET') return quotesList(request, env);
  if (p === '/api/order' && m === 'POST') return orderCreate(request, env);
  if (p === '/api/quote' && m === 'POST') return quoteCreate(request, env);
  return json({ error: 'Ruta nu există.' }, 404);
}

// ── Coduri de tracking / verificare (Google, Meta etc.) injectate în pagini ──
let TRACK_CACHE = null, TRACK_TS = 0;
async function getTracking(env) {
  if (!env.DB) return {};
  const now = Date.now();
  if (TRACK_CACHE && now - TRACK_TS < 60000) return TRACK_CACHE;
  const keys = ['ga4_id', 'gtm_id', 'meta_pixel', 'gsc_verification', 'head_code', 'body_code'];
  const out = {};
  try {
    const r = await env.DB.prepare(`SELECT key,value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
    for (const row of (r.results || [])) if (row.value) out[row.key] = row.value;
  } catch (e) { /* fără DB → fără injecție */ }
  TRACK_CACHE = out; TRACK_TS = now;
  return out;
}
function buildHeadCode(t) {
  let h = '';
  if (t.gsc_verification) {
    h += t.gsc_verification.includes('<meta') ? t.gsc_verification
      : `<meta name="google-site-verification" content="${esc(t.gsc_verification)}">`;
  }
  if (t.ga4_id) h += `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(t.ga4_id)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(t.ga4_id)}');</script>`;
  if (t.gtm_id) h += `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${esc(t.gtm_id)}');</script>`;
  if (t.meta_pixel) h += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(t.meta_pixel)}');fbq('track','PageView');</script>`;
  if (t.head_code) h += t.head_code;
  return h;
}
function buildBodyCode(t) {
  let b = '';
  if (t.gtm_id) b += `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${esc(t.gtm_id)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
  if (t.body_code) b += t.body_code;
  return b;
}

/* ── Mod „În curând" (coming soon) ─────────────────────────────────────── */
let CS_CACHE = null, CS_TS = 0;
async function getComingSoon(env) {
  const now = Date.now();
  if (CS_CACHE && now - CS_TS < 30000) return CS_CACHE;
  const keys = ['coming_soon', 'coming_soon_title', 'coming_soon_text', 'brandName', 'logo', 'phone', 'email', 'schedule'];
  const out = {};
  try {
    const r = await env.DB.prepare(`SELECT key,value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
    for (const row of (r.results || [])) if (row.value) out[row.key] = row.value;
  } catch (e) { /* fără DB */ }
  CS_CACHE = out; CS_TS = now;
  return out;
}
function comingSoonPage(cs) {
  const brand = cs.brandName || 'ExpoTigla';
  const title = cs.coming_soon_title || 'Ne lansăm în curând';
  const text = cs.coming_soon_text || 'Lucrăm la ceva grozav pentru acoperișul tău. Revino curând — sau contactează-ne pentru oferte și consultanță.';
  const logo = cs.logo ? `<img src="${cs.logo}" alt="${esc(brand)}">` : `<div class="brandtxt">${esc(brand)}</div>`;
  const chips = [];
  if (cs.phone) chips.push(`<a href="tel:${esc(cs.phone).replace(/\s+/g, '')}">📞 ${esc(cs.phone)}</a>`);
  if (cs.email) chips.push(`<a href="mailto:${esc(cs.email)}">✉️ ${esc(cs.email)}</a>`);
  const sched = cs.schedule ? `<p class="sched">${esc(cs.schedule)}</p>` : '';
  const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | ${esc(brand)}</title><meta name="robots" content="noindex">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230099cc' d='M12 3 2 12h3v8h14v-8h3z'/%3E%3C/svg%3E">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px;background:radial-gradient(ellipse at 50% 0%,#0b3b4a 0%,#072530 60%,#04161d 100%);color:#eaf4f8;text-align:center}
.box{max-width:640px}.box img{max-height:70px;margin-bottom:30px}.brandtxt{font-size:2rem;font-weight:800;margin-bottom:30px;color:#fff}
.badge{display:inline-block;background:rgba(0,153,204,.18);border:1px solid rgba(0,153,204,.5);color:#7fd4f0;padding:7px 16px;border-radius:999px;font-size:.82rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:22px}
h1{font-size:2.3rem;line-height:1.15;margin-bottom:16px;color:#fff}p{font-size:1.1rem;line-height:1.65;color:#bfd8e2;max-width:520px;margin:0 auto}
.chips{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:30px}
.chips a{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#eaf4f8;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600;transition:background .15s}
.chips a:hover{background:rgba(0,153,204,.28)}.sched{margin-top:20px;font-size:.95rem;color:#8fb3c2}
@media(max-width:520px){h1{font-size:1.7rem}}
</style></head><body><main class="box">
${logo}<span class="badge">În curând</span>
<h1>${esc(title)}</h1><p>${esc(text)}</p>
${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}${sched}
</main></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '3600', 'Cache-Control': 'no-store' } });
}

/* ── SEO: date structurate (JSON-LD) + Open Graph + robots + sitemap ─────── */
let SEO_CACHE = null, SEO_TS = 0;
async function getSeoData(env) {
  const now = Date.now();
  if (SEO_CACHE && now - SEO_TS < 60000) return SEO_CACHE;
  const keys = ['brandName', 'phone', 'email', 'schedule', 'address', 'company_name', 'company_cui', 'company_reg', 'company_seat', 'seo_areas', 'seo_default_desc'];
  const out = {};
  try {
    const r = await env.DB.prepare(`SELECT key,value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
    for (const row of (r.results || [])) if (row.value) out[row.key] = row.value;
  } catch (e) { /* fără DB */ }
  SEO_CACHE = out; SEO_TS = now;
  return out;
}
function buildSeoHead(s, url) {
  const origin = url.origin;
  const name = s.brandName || 'ExpoTigla';
  const DEFAULT_AREAS = ['București', 'Ilfov', 'Giurgiu', 'Călărași', 'Prahova', 'Dâmbovița'];
  let areas = (s.seo_areas || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean);
  if (!areas.length) areas = DEFAULT_AREAS;
  const biz = {
    '@context': 'https://schema.org', '@type': 'RoofingContractor',
    name, url: origin + '/',
  };
  if (s.phone) biz.telephone = s.phone;
  if (s.email) biz.email = s.email;
  if (s.address) biz.address = { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'RO' };
  if (areas.length) biz.areaServed = areas.map(a => ({ '@type': 'City', name: a }));
  if (s.company_cui) biz.vatID = s.company_cui;
  biz.priceRange = '$$';
  const website = {
    '@context': 'https://schema.org', '@type': 'WebSite', name, url: origin + '/',
    potentialAction: { '@type': 'SearchAction', target: origin + '/produse.html?q={search_term_string}', 'query-input': 'required name=search_term_string' },
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(biz)}</script><script type="application/ld+json">${JSON.stringify(website)}</script>`;
  const og = `<meta property="og:site_name" content="${esc(name)}"><meta property="og:type" content="website"><meta property="og:locale" content="ro_RO"><meta property="og:url" content="${esc(url.href.split('#')[0])}"><meta name="twitter:card" content="summary_large_image">`;
  return jsonld + og;
}
// ── Pagini pe zone (SEO local, generate server-side) ───────────────────────
const ZONE_JUDETE = {
  'bucuresti': { name: 'București', prep: 'în', cities: ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5', 'Sector 6'] },
  'ilfov': { name: 'Ilfov', prep: 'în', cities: ['Voluntari', 'Otopeni', 'Buftea', 'Pantelimon', 'Popești-Leordeni', 'Bragadiru', 'Chitila', 'Măgurele', 'Chiajna', 'Snagov', 'Corbeanca', 'Mogoșoaia'] },
  'giurgiu': { name: 'Giurgiu', prep: 'în', cities: ['Giurgiu', 'Bolintin-Vale', 'Mihăilești', 'Ogrezeni', 'Comana', 'Călugăreni'] },
  'calarasi': { name: 'Călărași', prep: 'în', cities: ['Călărași', 'Oltenița', 'Budești', 'Fundulea', 'Lehliu-Gară', 'Borcea', 'Dragalina'] },
  'prahova': { name: 'Prahova', prep: 'în', cities: ['Ploiești', 'Câmpina', 'Băicoi', 'Mizil', 'Vălenii de Munte', 'Sinaia', 'Bușteni', 'Boldești-Scăeni', 'Breaza', 'Comarnic'] },
  'dambovita': { name: 'Dâmbovița', prep: 'în', cities: ['Târgoviște', 'Moreni', 'Găești', 'Pucioasa', 'Titu', 'Fieni', 'Răcari'] },
};
function zoneHeaderFooter() {
  return {
    header: `<header class="site-header"><div class="container header-inner">
      <a href="index.html" class="logo">Expo<b>Tigla</b></a>
      <nav class="nav">
        <a href="index.html">Acasă</a><a href="produse.html">Produse</a><a href="branduri.html">Branduri</a><a href="servicii.html">Montaj &amp; consultanță</a><a href="blog.html">Ghidul acoperișului</a><a href="despre.html">Despre noi</a><a href="contact.html">Contact</a>
      </nav>
      <div class="header-actions">
        <a href="cos.html" class="cart-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><span>Coș</span><span class="cart-count">0</span></a>
        <button class="menu-toggle" aria-label="Meniu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
      </div></div></header>`,
    footer: `<footer class="site-footer"><div class="container"><div class="footer-grid">
      <div class="footer-col"><div class="logo">Expo<b>Tigla</b></div><p>Sisteme complete de acoperiș pentru case și clădiri industriale. Calitate de la producător, cu garanție și livrare națională.</p></div>
      <div class="footer-col"><h4>Produse</h4><a href="produse.html?cat=tigla-metalica">Țiglă metalică</a><a href="produse.html?cat=tabla-faltuita">Tablă fălțuită</a><a href="produse.html?cat=panouri-sandwich">Panouri sandwich</a><a href="produse.html?cat=sistem-pluvial">Sistem pluvial</a><a href="produse.html?cat=accesorii">Accesorii</a></div>
      <div class="footer-col"><h4>Companie</h4><a href="despre.html">Despre noi</a><a href="servicii.html">Montaj &amp; consultanță</a><a href="blog.html">Ghidul acoperișului</a><a href="contact.html">Contact</a></div>
      <div class="footer-col"><h4>Contact</h4><p>📞 <span data-site="phone">0740 000 000</span></p><p>✉️ <span data-site="email">comenzi@acoperispro.ro</span></p><p>📍 <span data-site="address">București</span></p></div>
      </div><div class="footer-bottom">© <span class="js-year">2026</span> ExpoTigla. Toate drepturile rezervate. Prețurile includ TVA.</div></div></footer>`,
  };
}
async function renderZonePage(env, url, slug) {
  const z = ZONE_JUDETE[slug];
  const s = await getSeoData(env);
  const origin = url.origin;
  const name = z.name;
  const brand = s.brandName || 'ExpoTigla';
  const title = `Materiale acoperiș, țiglă metalică și montaj ${z.prep} ${name} | ${brand}`;
  const desc = `Țiglă metalică, tablă fălțuită, panouri sandwich, sisteme pluviale și accesorii ${z.prep} ${name}. Consultanță, calcul de necesar, livrare și montaj profesional. Cere ofertă la ${brand}.`;
  const cats = [
    ['Țiglă metalică', 'tigla-metalica'], ['Tablă fălțuită', 'tabla-faltuita'], ['Panouri sandwich', 'panouri-sandwich'],
    ['Sisteme pluviale', 'sistem-pluvial'], ['Folii și membrane', 'folii-membrane'], ['Accesorii', 'accesorii'],
  ];
  const biz = {
    '@context': 'https://schema.org', '@type': 'RoofingContractor', name: `${brand} — ${name}`, url: `${origin}/acoperis-${slug}`,
    areaServed: [{ '@type': 'AdministrativeArea', name }, ...z.cities.map(c => ({ '@type': 'City', name: c }))],
  };
  if (s.phone) biz.telephone = s.phone;
  if (s.email) biz.email = s.email;
  const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Acasă', item: origin + '/' },
    { '@type': 'ListItem', position: 2, name: 'Zone deservite', item: origin + '/acoperis-' + slug },
    { '@type': 'ListItem', position: 3, name: name },
  ] };
  const hf = zoneHeaderFooter();
  const html = `<!DOCTYPE html><html lang="ro"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${origin}/acoperis-${slug}">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230099cc' d='M12 3 2 12h3v8h14v-8h3z'/%3E%3C/svg%3E">
<script type="application/ld+json">${JSON.stringify([biz, bc])}</script>
</head><body>
${hf.header}
<section class="hero hero-simple" style="padding:56px 0 60px"><div class="container">
  <span class="eyebrow" style="color:#bfe6f4">Zonă deservită</span>
  <h1>Materiale pentru acoperiș și montaj ${z.prep} ${esc(name)}</h1>
  <p style="max-width:820px;margin:16px auto 0;color:#dbe8f0;font-size:1.1rem">Livrăm și montăm sisteme complete de acoperiș ${z.prep} ${esc(name)}: țiglă metalică, tablă fălțuită, panouri sandwich, sisteme pluviale, folii, accesorii. Consultanță tehnică gratuită și calcul de necesar pentru proiectul tău.</p>
</div></section>
<section class="section"><div class="container" style="max-width:960px">
  <h2 style="margin-bottom:14px">Ce oferim ${z.prep} ${esc(name)}</h2>
  <p class="muted" style="margin-bottom:20px">Produse de la producători consacrați (Lindab, Wetterbest, Metigla), cu garanție și documente tehnice.</p>
  <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:36px">
    ${cats.map(([n, id]) => `<a href="produse.html?cat=${id}" class="btn btn-outline">${esc(n)}</a>`).join('')}
  </div>
  <h2 style="margin-bottom:14px">Montaj și consultanță ${z.prep} ${esc(name)}</h2>
  <p class="muted" style="margin-bottom:20px">Nu vindem doar materiale — te ajutăm să alegi corect și, la cerere, montăm acoperișul cu echipe specializate. <a href="servicii.html" style="color:var(--terra-dark);font-weight:600">Vezi serviciile de montaj →</a></p>
  <h2 style="margin-bottom:14px">Orașe și localități în ${esc(name)}</h2>
  <p class="muted" style="margin-bottom:14px">Livrare și montaj în ${esc(name)} și împrejurimi, inclusiv:</p>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:36px">
    ${z.cities.map(c => `<span style="background:#eef5f9;border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:.9rem;color:var(--navy)">${esc(c)}</span>`).join('')}
  </div>
</div></section>
<section class="section" style="padding-top:0"><div class="container" style="max-width:960px">
  <div style="background:var(--navy);color:#fff;border-radius:20px;padding:44px 32px;text-align:center">
    <h2 style="color:#fff;font-size:1.7rem;margin:0 0 10px">Ai un proiect de acoperiș ${z.prep} ${esc(name)}?</h2>
    <p style="color:#cfe3ee;max-width:640px;margin:0 auto 22px;font-size:1.06rem">Spune-ne ce ai nevoie și îți răspundem cu recomandarea potrivită, calculul de necesar și oferta — inclusiv montaj.</p>
    <a href="contact.html" class="btn btn-primary">Cere ofertă & consultanță</a>
  </div>
</div></section>
${hf.footer}
<script src="/assets/js/store-img.js"></script><script src="/assets/js/data.js"></script><script src="/assets/js/cart.js"></script><script src="/assets/js/main.js"></script>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=1800' } });
}
function robotsTxt(url) {
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${url.origin}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
async function sitemapXml(env, url) {
  const o = url.origin;
  const staticPages = ['produse.html', 'branduri.html', 'servicii.html', 'despre.html', 'contact.html', 'blog.html', 'livrare.html', 'termeni.html', 'confidentialitate.html', 'cookies.html', 'faq.html', 'cum-cumpar.html'];
  const cats = ['tigla-metalica', 'tabla-faltuita', 'panouri-sandwich', 'sistem-pluvial', 'folii-membrane', 'borduri', 'ventilatii', 'suruburi', 'accesorii'];
  const u = [`<url><loc>${o}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`];
  staticPages.forEach(p => u.push(`<url><loc>${o}/${p}</loc><changefreq>monthly</changefreq></url>`));
  cats.forEach(c => u.push(`<url><loc>${o}/produse.html?cat=${c}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`));
  Object.keys(ZONE_JUDETE).forEach(z => u.push(`<url><loc>${o}/acoperis-${z}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`));
  try {
    const r = await env.DB.prepare('SELECT id FROM products WHERE active=1').all();
    (r.results || []).forEach(p => u.push(`<url><loc>${o}/produs.html?id=${encodeURIComponent(p.id)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`));
    const posts = await env.DB.prepare('SELECT slug FROM posts WHERE active=1').all();
    (posts.results || []).forEach(p => u.push(`<url><loc>${o}/blog.html?slug=${encodeURIComponent(p.slug)}</loc><changefreq>monthly</changefreq></url>`));
  } catch (e) { /* fără DB */ }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${u.join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env, url); }
      catch (e) { console.error(e); return json({ error: 'Eroare internă.' }, 500); }
    }
    // Mod „În curând": ascunde paginile publice (adminul, API-ul și fișierele rămân accesibile)
    {
      const p = url.pathname;
      const assetLike = p.startsWith('/assets/') || p.startsWith('/admin') || p === '/robots.txt' || p === '/sitemap.xml' || (/\.[a-z0-9]{2,6}$/i.test(p) && !p.endsWith('.html'));
      if (!assetLike) {
        try {
          await ensureSchema(env);
          const cs = await getComingSoon(env);
          if (cs.coming_soon === 'on') {
            const cookie = request.headers.get('Cookie') || '';
            if (url.searchParams.get('preview') === '1') {
              const to = new URL(url); to.searchParams.delete('preview');
              return new Response(null, { status: 302, headers: { 'Location': to.pathname + (to.search || ''), 'Set-Cookie': 'es_preview=1; Path=/; Max-Age=86400; SameSite=Lax' } });
            }
            if (!/(?:^|;\s*)es_preview=1/.test(cookie)) return comingSoonPage(cs);
          }
        } catch (e) { /* la eroare, lăsăm site-ul normal */ }
      }
    }
    if (url.pathname === '/robots.txt') { try { await ensureSchema(env); } catch (e) {} return robotsTxt(url); }
    if (url.pathname === '/sitemap.xml') { try { await ensureSchema(env); } catch (e) {} return sitemapXml(env, url); }
    const zoneMatch = url.pathname.match(/^\/acoperis-([a-z-]+)$/);
    if (zoneMatch && ZONE_JUDETE[zoneMatch[1]]) { try { await ensureSchema(env); } catch (e) {} return renderZonePage(env, url, zoneMatch[1]); }
    const res = await env.ASSETS.fetch(request);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return res;
    const t = await getTracking(env);
    // SEO (date structurate + Open Graph) pe paginile publice, nu pe admin.
    const isAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin');
    const seoHead = isAdmin ? '' : buildSeoHead(await getSeoData(env), url);
    const head = buildHeadCode(t) + seoHead, body = buildBodyCode(t);
    if (!head && !body) return res;
    let rw = new HTMLRewriter();
    if (head) rw = rw.on('head', { element(el) { el.append(head, { html: true }); } });
    if (body) rw = rw.on('body', { element(el) { el.prepend(body, { html: true }); } });
    return rw.transform(res);
  },
};
