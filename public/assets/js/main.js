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

/* Dropdown „Produse" cu categoriile — injectat în meniu, pe toate paginile */
function injectProduseDropdown() {
  const nav = document.querySelector('.site-header .nav');
  if (!nav) return;
  const link = nav.querySelector('a[href="produse.html"]');
  if (!link || link.closest('.has-dropdown')) return;
  const cats = (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) ? CATEGORIES : [];
  if (!cats.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'has-dropdown';
  link.parentNode.insertBefore(wrap, link);
  wrap.appendChild(link);
  link.insertAdjacentHTML('beforeend', ' <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>');
  const menu = document.createElement('div');
  menu.className = 'nav-submenu';
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  menu.innerHTML = cats.map(c => `<a href="produse.html?cat=${c.id}">${esc(c.name)}</a>`).join('') +
    `<a href="produse.html" class="submenu-all">Vezi toate produsele</a>`;
  wrap.appendChild(menu);
  // Pe telefon, atingerea „Produse" pliază/depliază submeniul în loc să navigheze
  // (categoriile și „Vezi toate produsele" rămân pentru navigare).
  link.addEventListener('click', (e) => {
    if (window.matchMedia('(max-width: 720px)').matches) { e.preventDefault(); wrap.classList.toggle('open'); }
  });
}

/* Linkuri „Zone deservite" în subsol (SEO local + descoperire) */
function injectZoneLinks() {
  const cont = document.querySelector('.site-footer .container');
  if (!cont || cont.querySelector('.footer-zones')) return;
  const bottom = cont.querySelector('.footer-bottom');
  const ZONES = [['București', '/acoperis-bucuresti'], ['Ilfov', '/acoperis-ilfov'], ['Giurgiu', '/acoperis-giurgiu'], ['Călărași', '/acoperis-calarasi'], ['Prahova', '/acoperis-prahova'], ['Dâmbovița', '/acoperis-dambovita']];
  const div = document.createElement('div');
  div.className = 'footer-zones';
  div.innerHTML = '<span>Zone deservite:</span> ' + ZONES.map(([n, h]) => `<a href="${h}">${n}</a>`).join('');
  if (bottom) cont.insertBefore(div, bottom); else cont.appendChild(div);
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
  const price = p => (typeof cardPrice === 'function') ? cardPrice(p) : ((typeof formatPrice === 'function' && typeof displayPrice === 'function') ? formatPrice(displayPrice(p)) : '');
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
  a.title = 'Cerere ofertă rapidă';
  a.setAttribute('aria-label', 'Cerere ofertă rapidă');
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
    injectProduseDropdown(); // re-aplică dropdown-ul după reconstruirea meniului
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
    else if (mode === 'src') { el.setAttribute('src', val); el.style.display = ''; const fig = el.closest('[data-site-figure]'); if (fig) fig.style.display = ''; }
    else el.textContent = val;
  });
  // Iconițe social în footer (doar rețelele pentru care există link în setări)
  const SOCIAL_ICONS = {
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.71 3.71 0 0 1-1.38-.9 3.71 3.71 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.35 2.68.93 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.89 5.89 0 0 0 2.12-1.38 5.89 5.89 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.89 5.89 0 0 0-1.38-2.12A5.89 5.89 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-10.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.29-.15-1.73-.86-2-.95-.27-.1-.46-.15-.66.14-.19.29-.76.95-.93 1.15-.17.19-.34.22-.63.07-.29-.14-1.23-.45-2.34-1.44a8.75 8.75 0 0 1-1.62-2.01c-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.15-.17.19-.29.29-.49.1-.19.05-.36-.02-.51-.08-.14-.66-1.59-.9-2.18-.24-.57-.48-.49-.66-.5h-.57c-.19 0-.5.07-.77.36-.26.29-1 .98-1 2.38s1.03 2.76 1.17 2.96c.14.19 2.02 3.08 4.9 4.32.68.29 1.22.47 1.64.6.69.22 1.32.19 1.81.12.55-.08 1.7-.7 1.94-1.37.24-.67.24-1.24.17-1.37-.07-.12-.26-.19-.55-.34zM12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.73.98.99-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.44 4.44-9.87 9.9-9.87a9.83 9.83 0 0 1 6.98 2.9 9.82 9.82 0 0 1 2.9 6.98c0 5.44-4.44 9.87-9.89 9.87zM20.51 3.45A11.78 11.78 0 0 0 12.05.02C5.5.02.16 5.35.16 11.9c0 2.09.55 4.14 1.6 5.94L.06 24l6.33-1.66a11.86 11.86 0 0 0 5.66 1.44h.01c6.55 0 11.89-5.33 11.89-11.88a11.8 11.8 0 0 0-3.44-8.45z"/></svg>',
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
  // Chatbot AI (Grok) — doar dacă e activat din admin
  injectChatbot(s);
}

/* ==========================================================================
   Chatbot AI (Grok / xAI) — widget flotant. Trimite conversația la /api/chat,
   care o proxează server-side către xAI (cheia stă doar pe server).
   ========================================================================== */
function injectChatbot(s) {
  const on = s && (s.chatbot_enabled === 'on' || s.chatbot_enabled === '1' || s.chatbot_enabled === 'true');
  if (!on || document.getElementById('cbot')) return;
  const greeting = (s.chatbot_greeting && s.chatbot_greeting.trim()) || 'Salut! 👋 Cu ce te pot ajuta? Întreabă-mă despre produse, montaj sau consultanță.';
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const teaser = (s.chatbot_teaser && s.chatbot_teaser.trim()) || 'Ai o întrebare? 💬 Scrie-ne, răspundem rapid!';
  const wrap = document.createElement('div');
  wrap.id = 'cbot';
  wrap.innerHTML = `
    <div class="cbot-teaser" role="button" tabindex="0" aria-label="Deschide chat">
      <button class="cbot-teaser-x" aria-label="Închide" type="button">×</button>
      <span>${esc(teaser)}</span>
    </div>
    <button class="cbot-fab" aria-label="Deschide chat" type="button">
      <svg class="cbot-ic-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      <svg class="cbot-ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="cbot-panel" role="dialog" aria-label="Chat asistent">
      <div class="cbot-head">
        <div class="cbot-head-t"><span class="cbot-dot"></span> Asistent ExpoTigla</div>
        <button class="cbot-x" aria-label="Închide" type="button">×</button>
      </div>
      <div class="cbot-msgs" id="cbot-msgs"></div>
      <form class="cbot-input" id="cbot-form">
        <input type="text" id="cbot-text" placeholder="Scrie un mesaj…" autocomplete="off" maxlength="1000">
        <button type="submit" aria-label="Trimite"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
      </form>
    </div>`;
  document.body.appendChild(wrap);
  const fab = wrap.querySelector('.cbot-fab');
  const panel = wrap.querySelector('.cbot-panel');
  const msgsBox = wrap.querySelector('#cbot-msgs');
  const form = wrap.querySelector('#cbot-form');
  const input = wrap.querySelector('#cbot-text');
  const history = []; // {role, content} — trimis către API
  let busy = false;
  // Id de sesiune persistent (pentru istoricul din admin)
  let cbotSid = '';
  try {
    cbotSid = localStorage.getItem('cbot_session') || '';
    if (!cbotSid) { cbotSid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('cbot_session', cbotSid); }
  } catch (e) { cbotSid = 's' + Date.now().toString(36); }
  // Sugestii (chips) — din setări sau implicite
  const suggestions = (s.chatbot_suggestions && s.chatbot_suggestions.trim()
    ? s.chatbot_suggestions.split(/[\n|]+/) : ['Vreau o ofertă', 'Ce țiglă îmi recomandați?', 'Oferiți montaj?', 'Aveți consultanță tehnică?'])
    .map(x => x.trim()).filter(Boolean).slice(0, 6);
  const scroll = () => { msgsBox.scrollTop = msgsBox.scrollHeight; };
  function addBubble(role, text) {
    const b = document.createElement('div');
    b.className = 'cbot-b cbot-' + role;
    b.innerHTML = esc(text).replace(/\n/g, '<br>');
    msgsBox.appendChild(b); scroll(); return b;
  }
  // Acceptă doar linkuri interne (pagina.html[?...]) sau http(s); refuză javascript: etc.
  function safeHref(href) {
    href = (href || '').trim();
    if (/^javascript:/i.test(href)) return '';
    if (/^https?:\/\//i.test(href)) return href;
    if (/^\/?[a-z0-9._-]+\.html(\?[^\s]*)?$/i.test(href)) return href;
    return '';
  }
  // Răspunsul botului poate conține linkuri în format [Text](adresă) → butoane.
  function renderBotReply(text) {
    const links = [];
    const clean = String(text || '').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
      const s = safeHref(href);
      if (s) { links.push({ label: label.trim(), href: s }); return ''; }
      return label;
    }).replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
    const b = addBubble('bot', clean || '…');
    if (links.length) {
      const row = document.createElement('div');
      row.className = 'cbot-links';
      links.slice(0, 4).forEach(l => {
        const a = document.createElement('a');
        a.className = 'cbot-linkbtn';
        a.textContent = l.label;
        a.href = l.href;
        if (/^https?:/i.test(l.href)) { a.target = '_blank'; a.rel = 'noopener'; }
        row.appendChild(a);
      });
      msgsBox.appendChild(row); scroll();
    }
    return b;
  }
  function renderChips() {
    if (!suggestions.length) return;
    const box = document.createElement('div');
    box.className = 'cbot-chips';
    suggestions.forEach(txt => {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'cbot-chip'; c.textContent = txt;
      c.addEventListener('click', () => sendMessage(txt));
      box.appendChild(c);
    });
    msgsBox.appendChild(box); scroll();
  }
  function removeChips() { const c = msgsBox.querySelector('.cbot-chips'); if (c) c.remove(); }
  function openPanel() {
    wrap.classList.add('open');
    if (!msgsBox.dataset.init) { addBubble('bot', greeting); renderChips(); msgsBox.dataset.init = '1'; setTimeout(() => input.focus(), 60); }
  }
  function closePanel() { wrap.classList.remove('open'); }
  fab.addEventListener('click', () => wrap.classList.contains('open') ? closePanel() : openPanel());
  wrap.querySelector('.cbot-x').addEventListener('click', closePanel);

  // Pop-up mic de invitație lângă buton (o singură dată per sesiune).
  const teaserEl = wrap.querySelector('.cbot-teaser');
  const teaserX = wrap.querySelector('.cbot-teaser-x');
  let teaserDismissed = false;
  try { teaserDismissed = sessionStorage.getItem('cbot_teaser_off') === '1'; } catch (e) {}
  function hideTeaser(remember) {
    wrap.classList.remove('teaser-on');
    if (remember) { teaserDismissed = true; try { sessionStorage.setItem('cbot_teaser_off', '1'); } catch (e) {} }
  }
  if (!teaserDismissed) {
    setTimeout(() => { if (!wrap.classList.contains('open') && !teaserDismissed) wrap.classList.add('teaser-on'); }, 2600);
    setTimeout(() => hideTeaser(false), 15000); // dispare singur după un timp
  }
  teaserX.addEventListener('click', (e) => { e.stopPropagation(); hideTeaser(true); });
  teaserEl.addEventListener('click', () => { hideTeaser(true); openPanel(); });
  teaserEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hideTeaser(true); openPanel(); } });
  const _openPanel = openPanel;
  openPanel = function () { hideTeaser(true); _openPanel(); };
  async function sendMessage(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    removeChips();
    input.value = '';
    addBubble('user', text);
    history.push({ role: 'user', content: text });
    busy = true;
    const typing = addBubble('bot', '…'); typing.classList.add('cbot-typing');
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12), session_id: cbotSid }) });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (res.ok && data.reply) {
        renderBotReply(data.reply);
        history.push({ role: 'assistant', content: data.reply });
      } else {
        addBubble('bot', data.error || 'Momentan nu pot răspunde. Încearcă din nou sau scrie-ne pe pagina de contact.');
      }
    } catch (err) {
      typing.remove();
      addBubble('bot', 'Eroare de conexiune. Încearcă din nou.');
    }
    busy = false; scroll();
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(input.value); });
}
function loadSiteSettings() {
  // Ascunde meniul până se aplică setările, ca să nu pâlpâie meniul din HTML
  // înainte de a fi reconstruit din configurația salvată în admin.
  const nav = document.querySelector('.site-header .nav');
  if (nav) nav.classList.add('nav-pending');
  fetch('/api/settings').then(r => r.ok ? r.json() : {}).then(applySettings).catch(() => {})
    .finally(() => { if (nav) nav.classList.remove('nav-pending'); });
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
  injectProduseDropdown();
  injectSearch();
  injectHeaderCta();
  injectFooterLegal();
  injectZoneLinks();
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
