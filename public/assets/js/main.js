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

/* Linkuri utile + legale în footer, injectate pe toate paginile */
function injectFooterLegal() {
  // Linkuri de ajutor în coloana „Companie"
  const cols = document.querySelectorAll('.site-footer .footer-col');
  for (const col of cols) {
    const h = col.querySelector('h4');
    if (h && /companie/i.test(h.textContent)) {
      const help = [['cum-cumpar.html', 'Cum cumpăr'], ['livrare.html', 'Livrare & retur'], ['faq.html', 'Întrebări frecvente']];
      for (const [href, label] of help) {
        if (!col.querySelector(`a[href="${href}"]`)) {
          const a = document.createElement('a');
          a.href = href; a.textContent = label;
          col.appendChild(a);
        }
      }
      break;
    }
  }
  // Linkuri legale pe rândul de jos (copyright)
  const bottom = document.querySelector('.site-footer .footer-bottom');
  if (bottom && !bottom.querySelector('.footer-legal')) {
    const legal = [['termeni.html', 'Termeni și condiții'], ['confidentialitate.html', 'Confidențialitate'], ['cookies.html', 'Cookies']];
    const wrap = document.createElement('div');
    wrap.className = 'footer-legal';
    wrap.innerHTML = legal.map(([href, label]) => `<a href="${href}">${label}</a>`).join('<span>·</span>');
    bottom.appendChild(wrap);
  }
}

/* Banner-ele obligatorii ANPC (SAL) + SOL în subsol, pe toate paginile.
   Se folosesc imaginile oficiale; dacă nu se încarcă, apare un badge text. */
function injectAnpc() {
  const bottom = document.querySelector('.site-footer .footer-bottom');
  if (!bottom || document.querySelector('.footer-anpc')) return;
  const wrap = document.createElement('div');
  wrap.className = 'footer-anpc';
  wrap.innerHTML = `
    <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener" aria-label="ANPC – Soluționarea Alternativă a Litigiilor">
      <img src="assets/img/anpc-sal.svg" alt="ANPC – Soluționarea Alternativă a Litigiilor" width="244" height="60" loading="lazy">
    </a>
    <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener" aria-label="Soluționarea Online a Litigiilor (SOL)">
      <img src="assets/img/anpc-sol.svg" alt="SOL – Soluționarea Online a Litigiilor" width="244" height="60" loading="lazy">
    </a>`;
  bottom.insertBefore(wrap, bottom.firstChild);
}

/* Căutare produse — buton în antet + overlay cu sugestii live (pe toate paginile) */
const escBasic = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const searchNorm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function injectSearch() {
  const actions = document.querySelector('.site-header .header-actions');
  if (!actions || document.getElementById('site-search-overlay')) return;
  const btn = document.createElement('button');
  btn.className = 'search-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Caută produse');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
  btn.addEventListener('click', openSearch);
  actions.insertBefore(btn, actions.firstChild);

  const ov = document.createElement('div');
  ov.id = 'site-search-overlay';
  ov.className = 'search-overlay';
  ov.innerHTML = `<div class="search-panel" role="dialog" aria-label="Căutare produse">
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="site-search-input" type="search" placeholder="Caută produse (ex. țiglă, panou, jgheab)…" autocomplete="off">
        <button class="search-close" type="button" aria-label="Închide">&times;</button>
      </div>
      <div class="search-results" id="site-search-results"></div>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) closeSearch(); });
  ov.querySelector('.search-close').addEventListener('click', closeSearch);
  const input = ov.querySelector('#site-search-input');
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(runSearch, 140); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
    else if (e.key === 'Enter') { const q = input.value.trim(); if (q) location.href = 'produse.html?q=' + encodeURIComponent(q); }
  });
}
function openSearch() {
  const ov = document.getElementById('site-search-overlay'); if (!ov) return;
  ov.classList.add('open'); document.body.style.overflow = 'hidden';
  setTimeout(() => { const i = document.getElementById('site-search-input'); if (i) i.focus(); }, 30);
  if (typeof loadCatalog === 'function') loadCatalog().then(runSearch); else runSearch();
}
function closeSearch() {
  const ov = document.getElementById('site-search-overlay'); if (!ov) return;
  ov.classList.remove('open'); document.body.style.overflow = '';
}
function runSearch() {
  const input = document.getElementById('site-search-input');
  const box = document.getElementById('site-search-results');
  if (!input || !box) return;
  const q = input.value.trim();
  const products = (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) ? PRODUCTS : [];
  if (!q) { box.innerHTML = '<div class="search-hint">Scrie ca să cauți în catalog…</div>'; return; }
  const nq = searchNorm(q);
  const cat = p => (typeof categoryName === 'function' ? categoryName(p.cat) : '');
  const matches = products.filter(p => searchNorm(`${p.name} ${p.desc || ''} ${cat(p)} ${p.producator || ''}`).includes(nq));
  if (!matches.length) {
    box.innerHTML = `<div class="search-hint">Niciun produs pentru „${escBasic(q)}". <a href="contact.html">Cere ofertă →</a></div>`;
    return;
  }
  const top = matches.slice(0, 6);
  const price = p => (typeof formatPrice === 'function' && typeof displayPrice === 'function') ? formatPrice(displayPrice(p)) : '';
  box.innerHTML = top.map(p => `<a class="search-item" href="produs.html?id=${encodeURIComponent(p.id)}">
      <div class="si-info"><div class="si-name">${escBasic(p.name)}</div><div class="si-cat">${escBasic(cat(p))}${p.producator ? ' · ' + escBasic(p.producator) : ''}</div></div>
      <div class="si-price">${price(p)}</div></a>`).join('') +
    `<a class="search-all" href="produse.html?q=${encodeURIComponent(q)}">Vezi toate rezultatele (${matches.length}) →</a>`;
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
  // Rând dedicat cu datele firmei în subsol (doar câmpurile completate)
  const cparts = [];
  if (s.company_name) cparts.push(escBasic(s.company_name));
  if (s.company_cui) cparts.push('CUI ' + escBasic(s.company_cui));
  if (s.company_reg) cparts.push(escBasic(s.company_reg));
  if (s.company_seat) cparts.push('Sediu: ' + escBasic(s.company_seat));
  const bottom = document.querySelector('.site-footer .footer-bottom');
  if (bottom && cparts.length && !bottom.querySelector('.footer-company')) {
    const cdiv = document.createElement('div');
    cdiv.className = 'footer-company';
    cdiv.innerHTML = cparts.join(' <span>·</span> ');
    const anpc = bottom.querySelector('.footer-anpc');
    if (anpc) anpc.after(cdiv); else bottom.insertBefore(cdiv, bottom.firstChild);
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
  injectSearch();
  injectHeaderCta();
  injectFooterLegal();
  injectAnpc();
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
