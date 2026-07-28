/* ==========================================================================
   Acoperiș PRO — Date produse (catalog sisteme de acoperiș)
   Prețuri în RON, cu TVA. Datele sunt statice (demo) — pot fi înlocuite
   ulterior cu un API / CMS fără a schimba restul aplicației.
   ========================================================================== */

/* Ilustrații SVG reutilizabile, colorate pe categorie.
   Fiecare funcție primește o culoare și returnează un SVG de tip "textură acoperiș". */
const SVG = {
  tigla: (c1, c2) => `
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <g fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2">
        ${[0,1,2,3,4,5].map(r=>`<path d="M0 ${40+r*45} Q25 ${28+r*45} 50 ${40+r*45} T100 ${40+r*45} T150 ${40+r*45} T200 ${40+r*45} T250 ${40+r*45} T300 ${40+r*45} T350 ${40+r*45} T400 ${40+r*45}"/>`).join('')}
      </g>
      <g fill="rgba(255,255,255,.10)">
        ${[0,1,2,3,4,5].map(r=>`<path d="M0 ${40+r*45} Q25 ${28+r*45} 50 ${40+r*45} T100 ${40+r*45} T150 ${40+r*45} T200 ${40+r*45} T250 ${40+r*45} T300 ${40+r*45} T350 ${40+r*45} T400 ${40+r*45} V${28+r*45} H0 Z"/>`).join('')}
      </g>
    </svg>`,
  falt: (c1, c2) => `
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="gf" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#gf)"/>
      <g stroke="rgba(0,0,0,.20)" stroke-width="3">
        ${[0,1,2,3,4,5,6,7].map(i=>`<line x1="${30+i*48}" y1="0" x2="${30+i*48}" y2="300"/>`).join('')}
      </g>
      <g stroke="rgba(255,255,255,.28)" stroke-width="2">
        ${[0,1,2,3,4,5,6,7].map(i=>`<line x1="${36+i*48}" y1="0" x2="${36+i*48}" y2="300"/>`).join('')}
      </g>
    </svg>`,
  panou: (c1, c2) => `
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#gp)"/>
      <g stroke="rgba(0,0,0,.15)" stroke-width="10">
        ${[0,1,2,3].map(i=>`<line x1="0" y1="${45+i*70}" x2="400" y2="${45+i*70}"/>`).join('')}
      </g>
      <g stroke="rgba(255,255,255,.18)" stroke-width="2">
        ${[0,1,2,3].map(i=>`<line x1="0" y1="${58+i*70}" x2="400" y2="${58+i*70}"/>`).join('')}
      </g>
    </svg>`,
  pluvial: (c1, c2) => `
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="gpl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#gpl)"/>
      <rect x="60" y="70" width="280" height="60" rx="30" fill="rgba(255,255,255,.14)" stroke="rgba(0,0,0,.2)" stroke-width="3"/>
      <rect x="175" y="120" width="50" height="150" rx="25" fill="rgba(255,255,255,.14)" stroke="rgba(0,0,0,.2)" stroke-width="3"/>
      <ellipse cx="200" cy="100" rx="118" ry="16" fill="rgba(0,0,0,.12)"/>
    </svg>`,
  accesoriu: (c1, c2) => `
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="ga" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#ga)"/>
      <g fill="rgba(255,255,255,.16)" stroke="rgba(0,0,0,.18)" stroke-width="2">
        <circle cx="130" cy="120" r="34"/><circle cx="130" cy="120" r="14" fill="rgba(0,0,0,.15)"/>
        <rect x="230" y="150" width="90" height="26" rx="6" transform="rotate(-18 275 163)"/>
        <rect x="90" y="200" width="120" height="20" rx="5"/>
      </g>
    </svg>`,
  folie: (c1, c2) => `
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="gfo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#gfo)"/>
      <g fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2">
        ${[...Array(9)].map((_,i)=>`<line x1="0" y1="${i*36}" x2="400" y2="${i*36+18}"/>`).join('')}
      </g>
      <circle cx="300" cy="80" r="70" fill="rgba(255,255,255,.10)"/>
    </svg>`,
};

const CATEGORIES = [
  { id: 'tigla-metalica', name: 'Țiglă metalică', icon: 'tigla',
    desc: 'Panouri de țiglă metalică cu aspect clasic, ușoare și rezistente la intemperii.' },
  { id: 'tabla-faltuita', name: 'Tablă fălțuită', icon: 'falt',
    desc: 'Sistem de tablă prefălțuită tip standing seam pentru un look modern, elegant.' },
  { id: 'panouri-sandwich', name: 'Panouri sandwich', icon: 'panou',
    desc: 'Panouri termoizolante pentru acoperiș, montaj rapid, izolare superioară.' },
  { id: 'sistem-pluvial', name: 'Sistem pluvial', icon: 'pluvial',
    desc: 'Jgheaburi, burlane și accesorii pentru un drenaj eficient al apei.' },
  { id: 'accesorii', name: 'Accesorii montaj', icon: 'accesoriu',
    desc: 'Coame, parazăpezi, șuruburi autoforante și elemente de finisaj.' },
  { id: 'folii-membrane', name: 'Folii & membrane', icon: 'folie',
    desc: 'Folii anticondens și membrane difuzie pentru protecția șarpantei.' },
];

const PRODUCTS = [
  // ── Țiglă metalică ──
  { id: 'tm-clasic-05', cat: 'tigla-metalica', name: 'Țiglă metalică Clasic 0.5mm',
    price: 42.90, unit: 'mp', badge: 'Best seller',
    desc: 'Profil clasic din oțel 0.5mm cu strat de zinc și poliester mat, garanție 15 ani.',
    svg: SVG.tigla('#8a3a2a', '#5e2318'),
    specs: { 'Grosime': '0.5 mm', 'Acoperire': 'Poliester mat 25µm', 'Culoare': 'Roșu cărămiziu RAL 8004', 'Garanție': '15 ani', 'Greutate': '4.8 kg/mp' } },
  { id: 'tm-premium-galvalume', cat: 'tigla-metalica', name: 'Țiglă metalică Premium Galvalume 0.6mm',
    price: 58.50, unit: 'mp', badge: 'Premium',
    desc: 'Oțel Galvalume 0.6mm cu protecție anticorozivă superioară, ideal pentru zone cu vânt puternic.',
    svg: SVG.tigla('#3a4652', '#232c34'),
    specs: { 'Grosime': '0.6 mm', 'Acoperire': 'Matt PU 35µm', 'Culoare': 'Antracit RAL 7016', 'Garanție': '25 ani', 'Greutate': '5.4 kg/mp' } },
  { id: 'tm-modular-negru', cat: 'tigla-metalica', name: 'Țiglă metalică modulară Onduline Black',
    price: 64.00, unit: 'mp', badge: null,
    desc: 'Panouri modulare de 1.2m, ușor de transportat și montat, finisaj negru mat elegant.',
    svg: SVG.tigla('#2b2f33', '#141618'),
    specs: { 'Grosime': '0.5 mm', 'Modul': '1200 x 420 mm', 'Culoare': 'Negru mat RAL 9005', 'Garanție': '20 ani', 'Greutate': '5.0 kg/mp' } },

  // ── Tablă fălțuită ──
  { id: 'tf-standing-seam', cat: 'tabla-faltuita', name: 'Tablă fălțuită Standing Seam 0.5mm',
    price: 71.00, unit: 'mp', badge: 'Nou',
    desc: 'Sistem standing seam cu fălțuire dublă, aspect liniar modern, fără șuruburi vizibile.',
    svg: SVG.falt('#6b7681', '#454e57'),
    specs: { 'Grosime': '0.5 mm', 'Lățime modul': '510 mm', 'Culoare': 'Gri argintiu RAL 9006', 'Garanție': '30 ani', 'Fălțuire': 'Dublă 25mm' } },
  { id: 'tf-click-antracit', cat: 'tabla-faltuita', name: 'Tablă prefălțuită Click Antracit',
    price: 66.50, unit: 'mp', badge: null,
    desc: 'Panouri prefălțuite cu îmbinare tip click, montaj rapid fără mașină de fălțuit.',
    svg: SVG.falt('#333b42', '#1c2126'),
    specs: { 'Grosime': '0.5 mm', 'Lățime modul': '530 mm', 'Culoare': 'Antracit RAL 7016', 'Garanție': '25 ani', 'Îmbinare': 'Click snap-lock' } },
  { id: 'tf-cupru-look', cat: 'tabla-faltuita', name: 'Tablă fălțuită aspect cupru 0.6mm',
    price: 98.00, unit: 'mp', badge: 'Premium',
    desc: 'Finisaj special aspect cupru pentru proiecte arhitecturale deosebite.',
    svg: SVG.falt('#b5652f', '#7d3f18'),
    specs: { 'Grosime': '0.6 mm', 'Lățime modul': '510 mm', 'Culoare': 'Aspect cupru', 'Garanție': '30 ani', 'Fălțuire': 'Dublă' } },

  // ── Panouri sandwich ──
  { id: 'ps-40mm', cat: 'panouri-sandwich', name: 'Panou sandwich acoperiș 40mm PUR',
    price: 89.00, unit: 'mp', badge: 'Best seller',
    desc: 'Panou termoizolant cu miez poliuretanic de 40mm, 5 cute, pentru hale și anexe.',
    svg: SVG.panou('#c9ccd0', '#9aa0a6'),
    specs: { 'Grosime miez': '40 mm', 'Izolație': 'Poliuretan PUR', 'Lățime utilă': '1000 mm', 'U': '0.53 W/mpK', 'Culoare': 'Alb RAL 9002' } },
  { id: 'ps-60mm', cat: 'panouri-sandwich', name: 'Panou sandwich acoperiș 60mm PIR',
    price: 118.00, unit: 'mp', badge: null,
    desc: 'Miez PIR ignifug de 60mm, izolare termică superioară și clasă de foc B.',
    svg: SVG.panou('#d7d9dc', '#a7adb3'),
    specs: { 'Grosime miez': '60 mm', 'Izolație': 'PIR ignifug', 'Lățime utilă': '1000 mm', 'U': '0.36 W/mpK', 'Reacție foc': 'B-s1,d0' } },
  { id: 'ps-100mm', cat: 'panouri-sandwich', name: 'Panou sandwich acoperiș 100mm PIR',
    price: 156.00, unit: 'mp', badge: null,
    desc: 'Cea mai bună izolare din gamă, recomandat pentru spații locuibile și frigorifice.',
    svg: SVG.panou('#cfd2d6', '#9ba1a7'),
    specs: { 'Grosime miez': '100 mm', 'Izolație': 'PIR ignifug', 'Lățime utilă': '1000 mm', 'U': '0.22 W/mpK', 'Reacție foc': 'B-s1,d0' } },

  // ── Sistem pluvial ──
  { id: 'sp-jgheab-150', cat: 'sistem-pluvial', name: 'Jgheab semicircular Ø150 din oțel',
    price: 34.00, unit: 'ml', badge: null,
    desc: 'Jgheab din oțel vopsit în câmp electrostatic, tronson 3m, prindere cu cârlige incluse.',
    svg: SVG.pluvial('#4a5560', '#2c343c'),
    specs: { 'Diametru': 'Ø150 mm', 'Material': 'Oțel 0.6mm', 'Lungime': '3 m/buc', 'Culoare': 'Maro RAL 8017', 'Garanție': '15 ani' } },
  { id: 'sp-burlan-100', cat: 'sistem-pluvial', name: 'Burlan rotund Ø100 din oțel',
    price: 29.50, unit: 'ml', badge: null,
    desc: 'Burlan din oțel asortat jgheabului Ø150, tronson 3m, coliere de prindere incluse.',
    svg: SVG.pluvial('#525d68', '#333b43'),
    specs: { 'Diametru': 'Ø100 mm', 'Material': 'Oțel 0.6mm', 'Lungime': '3 m/buc', 'Culoare': 'Maro RAL 8017', 'Garanție': '15 ani' } },
  { id: 'sp-kit-casa', cat: 'sistem-pluvial', name: 'Kit sistem pluvial casă (pachet complet)',
    price: 1290.00, unit: 'set', badge: 'Economic',
    desc: 'Pachet complet pentru o casă medie: jgheaburi, burlane, coturi, racorduri și accesorii.',
    svg: SVG.pluvial('#425e4a', '#28382e'),
    specs: { 'Acoperire': '~120 mp acoperiș', 'Jgheab': 'Ø150 x 24 ml', 'Burlan': 'Ø100 x 16 ml', 'Culoare': 'La alegere', 'Garanție': '15 ani' } },

  // ── Accesorii montaj ──
  { id: 'ac-coama', cat: 'accesorii', name: 'Coamă rotundă cu garnitură (2m)',
    price: 38.00, unit: 'buc', badge: null,
    desc: 'Coamă rotundă din tablă asortată, cu garnitură de etanșare inclusă, lungime 2m.',
    svg: SVG.accesoriu('#7a4030', '#4d2519'),
    specs: { 'Lungime': '2 m', 'Material': 'Oțel 0.5mm', 'Culoare': 'La alegere', 'Include': 'Garnitură burete' } },
  { id: 'ac-parazapada', cat: 'accesorii', name: 'Parazăpadă bară (set 3m)',
    price: 145.00, unit: 'set', badge: null,
    desc: 'Sistem de parazăpezi cu bară dublă și console, previne alunecarea zăpezii de pe acoperiș.',
    svg: SVG.accesoriu('#455059', '#282f35'),
    specs: { 'Lungime': '3 m', 'Console': '4 buc incluse', 'Material': 'Oțel zincat', 'Sarcină': 'Mare' } },
  { id: 'ac-suruburi', cat: 'accesorii', name: 'Șuruburi autoforante cu garnitură (250 buc)',
    price: 89.00, unit: 'cutie', badge: 'Best seller',
    desc: 'Șuruburi autoforante 4.8x35mm cu garnitură EPDM, cap vopsit, cutie 250 bucăți.',
    svg: SVG.accesoriu('#5a6570', '#363d44'),
    specs: { 'Dimensiune': '4.8 x 35 mm', 'Cantitate': '250 buc', 'Garnitură': 'EPDM', 'Cap': 'Vopsit la culoare' } },

  // ── Folii & membrane ──
  { id: 'fm-anticondens', cat: 'folii-membrane', name: 'Folie anticondens 3 straturi (75mp)',
    price: 320.00, unit: 'rolă', badge: null,
    desc: 'Folie anticondens cu strat absorbant, protejează șarpanta de umezeală. Rolă 1.5x50m.',
    svg: SVG.folie('#4a6b7a', '#2c4350'),
    specs: { 'Suprafață': '75 mp/rolă', 'Straturi': '3', 'Gramaj': '150 g/mp', 'Dimensiuni': '1.5 x 50 m' } },
  { id: 'fm-difuzie', cat: 'folii-membrane', name: 'Membrană difuzie hidroizolantă 150g (75mp)',
    price: 415.00, unit: 'rolă', badge: 'Premium',
    desc: 'Membrană traspirantă de înaltă difuzie, permeabilă la vapori și impermeabilă la apă.',
    svg: SVG.folie('#3d5a4a', '#243a2f'),
    specs: { 'Suprafață': '75 mp/rolă', 'Sd': '0.02 m', 'Gramaj': '150 g/mp', 'Coloană apă': '> 2000 mm' } },
];

/* Helpers de acces (folosite de pagini) */
function getProduct(id) { return PRODUCTS.find(p => p.id === id); }
function getCategory(id) { return CATEGORIES.find(c => c.id === id); }
function categoryName(id) { const c = getCategory(id); return c ? c.name : id; }

/* ── MEDIA (poze reale cu fallback pe SVG) ──────────────────────────────────
   Pentru a folosi poze reale: pune un fișier în
     assets/img/products/<id-produs>.jpg     (ex. assets/img/products/tm-clasic-05.jpg)
     assets/img/categories/<id-categorie>.jpg (ex. assets/img/categories/tigla-metalica.jpg)
   Dacă fișierul lipsește, se afișează automat ilustrația SVG (onerror fallback).
   Astfel poți adăuga pozele treptat, fără nicio modificare de cod. */
function productMedia(p) {
  return `<img class="pmedia" src="assets/img/products/${p.id}.jpg" alt="${p.name}"
    loading="lazy" onerror="mediaFallback(this,'p','${p.id}')">`;
}
function categoryMedia(c) {
  return `<img class="pmedia" src="assets/img/categories/${c.id}.jpg" alt="${c.name}"
    loading="lazy" onerror="mediaFallback(this,'c','${c.id}')">`;
}
/* Înlocuiește <img> stricat cu ilustrația SVG corespunzătoare */
function mediaFallback(img, type, id) {
  const item = type === 'p' ? getProduct(id) : getCategory(id);
  const svg = type === 'p' ? (item && item.svg) : (item && SVG[item.icon] && SVG[item.icon](...(CAT_SVG_COLORS[id] || ['#16324f', '#0f2438'])));
  if (!svg) { img.style.visibility = 'hidden'; return; }
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%';
  wrap.innerHTML = svg;
  img.replaceWith(wrap.firstElementChild || wrap);
}
/* Culori SVG per categorie (folosite la fallback-ul de categorie) */
const CAT_SVG_COLORS = {
  'tigla-metalica': ['#8a3a2a', '#5e2318'], 'tabla-faltuita': ['#6b7681', '#454e57'],
  'panouri-sandwich': ['#c9ccd0', '#9aa0a6'], 'sistem-pluvial': ['#4a5560', '#2c343c'],
  'accesorii': ['#5a6570', '#363d44'], 'folii-membrane': ['#4a6b7a', '#2c4350'],
};
function formatPrice(v) {
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' lei';
}
