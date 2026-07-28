// Utilitare comune pentru Pages Functions (auth JWT, răspunsuri JSON).
// Fișier cu prefix „_" => nu este rutat, doar importat de celelalte funcții.

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function b64u(s) { return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function fromb64u(s) { return atob(s.replace(/-/g, '+').replace(/_/g, '/')); }

export async function signJWT(payload, secret, expSec = 8 * 3600) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = b64u(JSON.stringify({ ...payload, iat: now, exp: now + expSec }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${b}`));
  return `${h}.${b}.${b64u(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export async function verifyJWT(token, secret) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('token invalid');
  const [h, b, s] = parts;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sig = Uint8Array.from(fromb64u(s), c => c.charCodeAt(0));
  const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(`${h}.${b}`));
  if (!ok) throw new Error('semnătură invalidă');
  const p = JSON.parse(fromb64u(b));
  if (p.exp && p.exp < Date.now() / 1000) throw new Error('token expirat');
  return p;
}

// Returnează payload-ul dacă requestul e autentificat ca admin, altfel null.
export async function requireAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/, '');
  if (!token) return null;
  try {
    const p = await verifyJWT(token, env.JWT_SECRET || 'dev-secret-change-me');
    return p && p.admin ? p : null;
  } catch { return null; }
}
