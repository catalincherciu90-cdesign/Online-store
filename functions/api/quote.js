// Cloudflare Pages Function — POST /api/quote
// Primește o cerere de ofertă (multipart/form-data) cu plan atașat opțional și
// o trimite pe email către firmă (prin Resend). Opțional, salvează planul în R2.
//
// Variabile de mediu (Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY  — cheia API de la resend.com (necesară pentru email)
//   QUOTE_TO_EMAIL  — adresa unde se primesc cererile (ex. oferte@firma.ro)
//   QUOTE_FROM      — expeditor verificat în Resend (opțional;
//                     implicit "Acoperis PRO <onboarding@resend.dev>")
// Binding opțional R2 (numit PLANS) pentru a arhiva planurile încărcate.

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Date invalide.' }, 400);
  }

  const nume = (form.get('nume') || '').toString().trim();
  const telefon = (form.get('telefon') || '').toString().trim();
  const email = (form.get('email') || '').toString().trim();
  const tip = (form.get('tip') || '').toString().trim();
  const suprafata = (form.get('suprafata') || '').toString().trim();
  const mesaj = (form.get('mesaj') || '').toString().trim();

  if (!nume || !telefon || !email || !mesaj) {
    return json({ ok: false, error: 'Completează câmpurile obligatorii.' }, 400);
  }

  // Fișierul de plan (opțional)
  const file = form.get('plan');
  let attachment = null;
  let planInfo = 'Fără plan atașat.';
  if (file && typeof file === 'object' && file.size > 0) {
    if (file.size > MAX_SIZE) {
      return json({ ok: false, error: 'Fișierul depășește 15 MB.' }, 413);
    }
    const buf = await file.arrayBuffer();
    attachment = { filename: file.name || 'plan', content: toBase64(buf) };
    planInfo = `${file.name} (${(file.size / 1048576).toFixed(2)} MB)`;

    // Arhivare opțională în R2
    if (env.PLANS) {
      try {
        const key = `plans/${Date.now()}-${(file.name || 'plan').replace(/[^\w.\-]/g, '_')}`;
        await env.PLANS.put(key, buf, { httpMetadata: { contentType: file.type || 'application/octet-stream' } });
        planInfo += ` — arhivat R2: ${key}`;
      } catch (e) { /* nefatal */ }
    }
  }

  const ref = 'OF-' + Date.now().toString().slice(-6);

  const html = `
    <h2>Cerere de ofertă nouă — ${esc(ref)}</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><b>Nume</b></td><td>${esc(nume)}</td></tr>
      <tr><td><b>Telefon</b></td><td>${esc(telefon)}</td></tr>
      <tr><td><b>Email</b></td><td>${esc(email)}</td></tr>
      <tr><td><b>Tip proiect</b></td><td>${esc(tip)}</td></tr>
      <tr><td><b>Suprafață</b></td><td>${esc(suprafata)} mp</td></tr>
      <tr><td><b>Plan</b></td><td>${esc(planInfo)}</td></tr>
    </table>
    <p><b>Mesaj:</b><br>${esc(mesaj).replace(/\n/g, '<br>')}</p>`;

  // Log (vizibil în Cloudflare → Functions → Real-time logs) — util și fără email configurat
  console.log('Cerere ofertă', ref, { nume, telefon, email, tip, suprafata, plan: planInfo });

  // Trimitere email (best-effort) dacă e configurat Resend
  let delivered = false, emailError = null;
  if (env.RESEND_API_KEY && env.QUOTE_TO_EMAIL) {
    try {
      const payload = {
        from: env.QUOTE_FROM || 'Acoperis PRO <onboarding@resend.dev>',
        to: [env.QUOTE_TO_EMAIL],
        reply_to: email,
        subject: `Cerere ofertă ${ref} — ${nume}`,
        html,
      };
      if (attachment) payload.attachments = [attachment];
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      delivered = r.ok;
      if (!r.ok) emailError = `Resend HTTP ${r.status}`;
    } catch (e) {
      emailError = String(e);
    }
  } else {
    emailError = 'Email neconfigurat (lipsesc RESEND_API_KEY / QUOTE_TO_EMAIL).';
  }

  // Cererea a fost acceptată (validată + logată/arhivată). delivered/emailError
  // sunt pentru diagnostic; clientul vede doar succesul.
  return json({ ok: true, ref, delivered, emailError });
}
// Notă: metodele non-POST primesc automat 405 (nu există alt handler exportat).
