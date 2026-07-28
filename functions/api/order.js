// Cloudflare Pages Function — POST /api/order
// Primește o comandă (JSON) cu datele clientului și liniile din coș (inclusiv
// opțiunile alese: finisaj / grosime / culoare) și o trimite pe email către
// firmă prin Resend.
//
// Variabile de mediu (Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY  — cheia API de la resend.com
//   ORDER_TO_EMAIL  — adresa unde se primesc comenzile (fallback: QUOTE_TO_EMAIL)
//   QUOTE_FROM      — expeditor verificat în Resend (opțional)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function fmt(v) {
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0) + ' lei';
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Date invalide.' }, 400); }

  const { nume, prenume, telefon, email, adresa, oras, judet, obs, items, total } = body || {};
  if (!nume || !telefon || !adresa || !Array.isArray(items) || !items.length) {
    return json({ ok: false, error: 'Date incomplete.' }, 400);
  }

  const ref = 'CMD-' + Date.now().toString().slice(-6);

  const rows = items.map(it => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(it.nume)}${it.optiuni ? `<br><small style="color:#888">${esc(it.optiuni)}</small>` : ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${esc(it.cant)} ${esc(it.unit || '')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(it.pret)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt((Number(it.pret) || 0) * (Number(it.cant) || 0))}</td>
    </tr>`).join('');

  const html = `
    <h2>Comandă nouă — ${esc(ref)}</h2>
    <h3>Client</h3>
    <table cellpadding="4">
      <tr><td><b>Nume</b></td><td>${esc(prenume)} ${esc(nume)}</td></tr>
      <tr><td><b>Telefon</b></td><td>${esc(telefon)}</td></tr>
      <tr><td><b>Email</b></td><td>${esc(email)}</td></tr>
      <tr><td><b>Adresă</b></td><td>${esc(adresa)}, ${esc(oras)}, ${esc(judet)}</td></tr>
      ${obs ? `<tr><td><b>Observații</b></td><td>${esc(obs)}</td></tr>` : ''}
    </table>
    <h3>Produse</h3>
    <table style="border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Produs</th>
        <th style="text-align:center;padding:6px 10px;border-bottom:2px solid #ddd">Cant.</th>
        <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #ddd">Preț unitar</th>
        <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #ddd">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:right;font-size:18px"><b>Total comandă: ${fmt(total)}</b></p>
    <p style="color:#888">Plată: ramburs la livrare.</p>`;

  console.log('Comandă nouă', ref, { nume, telefon, email, total, lines: items.length });

  const to = env.ORDER_TO_EMAIL || env.QUOTE_TO_EMAIL;
  let delivered = false, emailError = null;
  if (env.RESEND_API_KEY && to) {
    try {
      const payload = {
        from: env.QUOTE_FROM || 'Acoperis PRO <onboarding@resend.dev>',
        to: [to],
        reply_to: email || undefined,
        subject: `Comandă ${ref} — ${prenume || ''} ${nume}`,
        html,
      };
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify(payload),
      });
      delivered = r.ok;
      if (!r.ok) emailError = `Resend HTTP ${r.status}`;
    } catch (e) { emailError = String(e); }
  } else {
    emailError = 'Email neconfigurat (RESEND_API_KEY / ORDER_TO_EMAIL).';
  }

  return json({ ok: true, ref, delivered, emailError });
}
