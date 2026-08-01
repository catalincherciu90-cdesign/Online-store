/* ==========================================================================
   ExpoTigla — UI comun: meniu mobil, toast, an footer
   ========================================================================== */

/* Bară utilitară (business) injectată deasupra headerului, pe toate paginile */
function injectTopbar() {
  if (document.querySelector('.topbar')) return;
  const header = document.querySelector('.site-header');
  if (!header) return;
  const bar = document.createElement('div');
  bar.className = 'topbar';
  bar.innerHTML = `<div class="container topbar-inner">
    <div class="topbar-left">
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/></svg><span data-site="phone">0740 000 000</span></span>
      <span class="tb-hide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg><span data-site="email">oferte@acoperispro.ro</span></span>
      <span class="tb-hide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span data-site="schedule">Luni–Vineri 08:00–18:00</span></span>
    </div>
  </div>`;
  header.parentNode.insertBefore(bar, header);
}

/* Linkuri utile („Cum cumpăr", „Termeni și condiții") în footer, pe toate paginile */
function injectFooterLegal() {
  const cols = document.querySelectorAll('.site-footer .footer-col');
  for (const col of cols) {
    const h = col.querySelector('h4');
    if (h && /companie/i.test(h.textContent)) {
      const links = [['cum-cumpar.html', 'Cum cumpăr'], ['termeni.html', 'Termeni și condiții']];
      for (const [href, label] of links) {
        if (!col.querySelector(`a[href="${href}"]`)) {
          const a = document.createElement('a');
          a.href = href; a.textContent = label;
          col.appendChild(a);
        }
      }
      return;
    }
  }
}

/* CTA „Cerere ofertă rapidă" mutat direct în antet (bara de navigare) */
function injectHeaderCta() {
  const actions = document.querySelector('.site-header .header-actions');
  if (!actions || actions.querySelector('.header-cta')) return;
  const a = document.createElement('a');
  a.className = 'btn btn-primary header-cta';
  a.href = 'contact.html';
  a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="cta-label">Cerere ofertă rapidă</span>';
  actions.insertBefore(a, actions.firstChild);
}

/* Umbră pe header la scroll (aspect mai curat) */
function headerScrollShadow() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* Setări site (logo magazin + date de contact) încărcate din admin */
let SITE_SETTINGS = null;
function applySettings(s) {
  SITE_SETTINGS = s || {};
  // Logo magazin în header (dacă e încărcat)
  if (s.logo) {
    document.querySelectorAll('.site-header .logo').forEach(el => {
      el.classList.add('has-logo-img');
      el.innerHTML = `<img src="${s.logo}" alt="${(s.brandName || 'ExpoTigla')}" class="logo-img">`;
    });
  }
  // Meniu (bara de navigare) configurabil din admin
  if (s.nav) {
    try {
      const items = JSON.parse(s.nav);
      const nav = document.querySelector('.site-header .nav');
      if (Array.isArray(items) && items.length && nav) {
        const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        let cur = (location.pathname.split('/').pop() || 'index.html');
        if (cur === '') cur = 'index.html';
        nav.innerHTML = items.filter(it => it && it.visible !== false && it.label && it.href).map(it => {
          const base = String(it.href).split('?')[0].split('#')[0];
          const active = base === cur ? ' class="active"' : '';
          return `<a href="${esc(it.href)}"${active}>${esc(it.label)}</a>`;
        }).join('');
      }
    } catch (e) { /* config invalid → păstrează meniul implicit */ }
  }
  // Câmpuri marcate cu data-site (telefon, email, adresă, program, social…)
  document.querySelectorAll('[data-site]').forEach(el => {
    const key = el.getAttribute('data-site');
    const val = s[key];
    if (val == null || val === '') return;
    const mode = el.getAttribute('data-site-attr');
    if (mode === 'tel') el.setAttribute('href', 'tel:' + val.replace(/\s+/g, ''));
    else if (mode === 'mail') el.setAttribute('href', 'mailto:' + val);
    else if (mode === 'href') el.setAttribute('href', val);
    else el.textContent = val;
  });
  // Iconițe social în footer (doar rețelele pentru care există link în setări)
  const SOCIAL_ICONS = {
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8.2a5.7 5.7 0 0 0 3.6 1.3V6.7a3.4 3.4 0 0 1-3-3.4h-2.9v11.4a2 2 0 1 1-2-2c.2 0 .4 0 .6.1v-2.9a5 5 0 1 0 4.4 5V8.4c.4.2.8.4 1.3.5z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12zM10 15V9l5 3z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.2 7.2 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4c0-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 6 9.3c0 1.7 1.2 3.3 1.4 3.6s2.5 3.8 6 5.1c2.9 1.1 2.9.7 3.4.7s1.4-.6 1.6-1.1.2-1 .1-1.1-.3-.2-.5-.3z"/></svg>',
  };
  const socials = [['Facebook', 'facebook'], ['Instagram', 'instagram'], ['TikTok', 'tiktok'], ['YouTube', 'youtube'], ['WhatsApp', 'whatsapp']]
    .map(([name, key]) => [name, s[key], SOCIAL_ICONS[key]]).filter(x => x[1]);
  const col = document.querySelector('.site-footer .footer-col');
  if (socials.length && col && !col.querySelector('.footer-social')) {
    const div = document.createElement('div');
    div.className = 'footer-social';
    div.innerHTML = socials.map(([name, url, icon]) => `<a href="${url}" target="_blank" rel="noopener" aria-label="${name}">${icon}</a>`).join('');
    col.appendChild(div);
  }
}
function loadSiteSettings() {
  fetch('/api/settings').then(r => r.ok ? r.json() : {}).then(applySettings).catch(() => {});
}

/* ==========================================================================
   Reveal on scroll (subtil) + stagger pe grile — fără librării externe
   ========================================================================== */
const REVEAL_SELECTOR = '.section-head, .product-card, .cat-tile, .brand-logo, .feature, .post-card, .trust-item, [data-reveal]';
let revealObserver = null;
function initReveal() {
  // Fără IntersectionObserver → conținutul rămâne vizibil (nicio clasă .reveal)
  if (!('IntersectionObserver' in window)) return;
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealScan();
  // Prinde și cardurile adăugate dinamic (produse din API), o singură dată pe frame
  let queued = false;
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; revealScan(); }); };
  try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
}
function revealScan() {
  if (!revealObserver) return;
  const fresh = [...document.querySelectorAll(REVEAL_SELECTOR)]
    .filter(el => !el.classList.contains('reveal') && !el.closest('.reviews-marquee') && !el.closest('.hero'));
  if (!fresh.length) return;
  // Stagger: grupează elementele noi după părinte și le dă un mic delay incremental
  const byParent = new Map();
  fresh.forEach(el => { const p = el.parentElement || document.body; if (!byParent.has(p)) byParent.set(p, []); byParent.get(p).push(el); });
  byParent.forEach(list => list.forEach((el, i) => {
    el.classList.add('reveal');
    if (list.length > 1) el.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
    revealObserver.observe(el);
  }));
}

/* Placeholdere „skeleton" pentru grilele de produse (percepție de viteză) */
function skeletonCards(n) {
  const one = '<div class="skeleton-card" aria-hidden="true"><div class="sk sk-media"></div>' +
    '<div class="sk-body"><div class="sk sk-line sm"></div><div class="sk sk-line lg"></div>' +
    '<div class="sk sk-line"></div><div class="sk sk-line" style="width:88%"></div></div></div>';
  return one.repeat(n || 6);
}

/* Meniu mobil */
document.addEventListener('DOMContentLoaded', () => {
  injectTopbar();
  injectHeaderCta();
  injectFooterLegal();
  loadSiteSettings();
  headerScrollShadow();
  initReveal();
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
  // An curent în footer
  document.querySelectorAll('.js-year').forEach(el => el.textContent = new Date().getFullYear());
});

/* Comută câmpurile de firmă (persoană juridică) în formularele de comandă/ofertă */
function toggleCompany(form) {
  if (!form) return;
  const sel = form.querySelector('input[name="tip_client"]:checked');
  const isJur = sel && sel.value === 'juridica';
  const box = form.querySelector('.company-fields');
  if (!box) return;
  box.hidden = !isJur;
  const firma = box.querySelector('[name="firma"]'), cui = box.querySelector('[name="cui"]');
  if (firma) firma.required = isJur;
  if (cui) cui.required = isJur;
}

/* Toast reutilizabil */
let toastTimer;
function showToast(message) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>${message}</span>`;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
