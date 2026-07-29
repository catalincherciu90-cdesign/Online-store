/* ==========================================================================
   Acoperiș PRO — UI comun: meniu mobil, toast, an footer
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
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/></svg>0740 000 000</span>
      <span class="tb-hide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>oferte@acoperispro.ro</span>
      <span class="tb-hide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Luni–Vineri 08:00–18:00</span>
    </div>
    <div class="topbar-right"><a href="contact.html">Cerere ofertă rapidă →</a></div>
  </div>`;
  header.parentNode.insertBefore(bar, header);
}

/* Umbră pe header la scroll (aspect mai curat) */
function headerScrollShadow() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* Meniu mobil */
document.addEventListener('DOMContentLoaded', () => {
  injectTopbar();
  headerScrollShadow();
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
  // An curent în footer
  document.querySelectorAll('.js-year').forEach(el => el.textContent = new Date().getFullYear());
});

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
