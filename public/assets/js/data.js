/* ==========================================================================
   ExpoTigla — Date produse (catalog sisteme de acoperiș)
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

let CATEGORIES = [
  { id: 'tigla-metalica', name: 'Țiglă metalică', icon: 'tigla', tag: 'clasic, modular',
    desc: 'Soluții pentru acoperișuri rezidențiale, într-o varietate de profile, finisaje și culori.' },
  { id: 'tabla-faltuita', name: 'Tablă fălțuită', icon: 'falt', tag: 'standing seam, click',
    desc: 'Aspect modern și linii curate pentru proiecte rezidențiale și arhitectură contemporană.' },
  { id: 'panouri-sandwich', name: 'Panouri sandwich', icon: 'panou', tag: 'PUR, PIR',
    desc: 'Soluții eficiente pentru hale, spații industriale și construcții comerciale.' },
  { id: 'sistem-pluvial', name: 'Sisteme pluviale', icon: 'pluvial', tag: 'jgheaburi, burlane',
    desc: 'Jgheaburi, burlane și accesorii pentru evacuarea eficientă a apei.' },
  { id: 'borduri', name: 'Borduri și tinichigerie', icon: 'accesoriu', tag: 'coame, șorțuri, dolii',
    desc: 'Coame, șorțuri, dolii, pazii și parazăpezi pentru finisarea și etanșarea acoperișului.' },
  { id: 'ventilatii', name: 'Ventilații acoperiș', icon: 'accesoriu', tag: 'coșuri, treceri cabluri',
    desc: 'Coșuri de ventilație, treceri cabluri și elemente de aerisire pentru acoperiș.' },
  { id: 'folii-membrane', name: 'Folii și membrane', icon: 'folie', tag: 'anticondens, difuzie',
    desc: 'Protecție suplimentară și control al umidității pentru sistemul de acoperiș.' },
  { id: 'suruburi', name: 'Șuruburi', icon: 'accesoriu', tag: 'autoforante, torx',
    desc: 'Șuruburi autoforante cu cap torx și garnitură, în diverse dimensiuni și culori RAL.' },
  { id: 'accesorii', name: 'Altele', icon: 'accesoriu', tag: 'coame, parazăpezi',
    desc: 'Elementele necesare pentru un sistem complet și un montaj corect.' },
];

let PRODUCTS = [
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
  // Preferă poza principală încărcată din admin (D1, /api/pf/<id>/main); altfel
  // un fișier din repo; altfel fallback SVG (placeholder alb) la eroare.
  const file = (p && p.img) || `assets/img/products/${p.id}.jpg`;
  return `<img class="pmedia" alt="${p.name}" data-imgkey="p:${p.id}"
    data-file="${file}" loading="lazy">`;
}
function categoryMedia(c) {
  // Preferă poza încărcată din admin (D1, /api/categories/<id>/image); altfel fișier din repo.
  const file = (c && c.img) || `assets/img/categories/${c.id}.jpg`;
  return `<img class="pmedia" alt="${c.name}" data-imgkey="c:${c.id}"
    data-file="${file}" loading="lazy">`;
}
/* Rezolvă sursa fiecărei imagini: 1) poză încărcată în browser (IndexedDB),
   2) fișier din repo (assets/img/...), 3) ilustrație SVG (fallback).
   A se apela după ce s-a construit HTML-ul unei liste/pagini. */
// Împiedică blocarea la infinit dacă IndexedDB nu răspunde (ex. origine file://)
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}
async function hydrateImages(root) {
  const scope = root || document;
  const imgs = [...scope.querySelectorAll('img[data-imgkey]:not([data-hydrated])')];
  // O singură citire a cheilor din IndexedDB (cu timeout); get() se apelează
  // doar pentru imaginile care chiar au o poză încărcată.
  let stored = new Set();
  if (typeof ImgStore !== 'undefined') {
    try { stored = new Set(await withTimeout(ImgStore.keys(), 1500)); }
    catch (e) { /* IDB indisponibil/lent — cădem pe fișier/SVG */ }
  }
  for (const img of imgs) {
    img.setAttribute('data-hydrated', '1');
    const key = img.getAttribute('data-imgkey');
    const [type, id] = key.split(':');
    if (stored.has(key)) {
      try {
        const blob = await withTimeout(ImgStore.get(key), 1500);
        if (blob) { img.src = URL.createObjectURL(blob); continue; }
      } catch (e) { /* cade pe fișier/SVG */ }
    }
    img.onerror = () => mediaFallback(img, type, id);
    img.src = img.getAttribute('data-file');
  }
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

/* ── OPȚIUNI PRODUS (finisaj / grosime / culoare) ──────────────────────────
   Fiecare grup are valori cu un `delta` de preț (lei / unitate). Ce grupuri se
   aplică unui produs vine din categorie (CATEGORY_OPTIONS), cu posibilitate de
   override per-produs prin câmpul `options`. */
const OPTIONS = {
  finisaj: { label: 'Finisaj', type: 'pill', values: [
    { id: 'poliester-mat', name: 'Poliester mat', delta: 0 },
    { id: 'mat-structurat', name: 'Mat structurat', delta: 6 },
    { id: 'lucios', name: 'Lucios', delta: 0 },
    { id: 'aspect-lemn', name: 'Aspect lemn', delta: 14 },
  ]},
  grosime: { label: 'Grosime', type: 'pill', values: [
    { id: '040', name: '0.40 mm', delta: -4 },
    { id: '050', name: '0.50 mm', delta: 0 },
    { id: '060', name: '0.60 mm', delta: 9 },
  ]},
  culoare: { label: 'Culoare', type: 'swatch', values: [
    { id: 'ral8004', name: 'Cărămiziu · RAL 8004', hex: '#8a3a2a', delta: 0 },
    { id: 'ral7016', name: 'Antracit · RAL 7016', hex: '#383e42', delta: 0 },
    { id: 'ral9005', name: 'Negru mat · RAL 9005', hex: '#17181a', delta: 0 },
    { id: 'ral8017', name: 'Maro · RAL 8017', hex: '#3d2a20', delta: 0 },
    { id: 'ral3011', name: 'Roșu · RAL 3011', hex: '#7c2225', delta: 0 },
    { id: 'ral6005', name: 'Verde · RAL 6005', hex: '#1f3d2b', delta: 0 },
    { id: 'ral9006', name: 'Argintiu · RAL 9006', hex: '#a6a9ac', delta: 8 },
    { id: 'ral9002', name: 'Alb · RAL 9002', hex: '#eceae3', delta: 0 },
  ]},
};
const CATEGORY_OPTIONS = {
  'tigla-metalica': ['finisaj', 'grosime', 'culoare'],
  'tabla-faltuita': ['finisaj', 'grosime', 'culoare'],
  'panouri-sandwich': ['culoare'],
  'sistem-pluvial': ['finisaj', 'culoare'],
  'borduri': ['finisaj', 'culoare'],
  'ventilatii': ['finisaj', 'culoare'],
  'suruburi': ['finisaj', 'culoare'],
  'accesorii': ['finisaj', 'culoare'],
  'folii-membrane': ['finisaj'],
};
// ── Model cu FINISAJE (finisajul e principal; fiecare are culorile și grosimile
//    lui, cu preț ABSOLUT pe combinație). p.finishes = [{ id, colors:[ids],
//    thicknesses:[ids], prices:{ "culoare|grosime": pret } }]. ──────────────────
function usesFinishes(p) { return !!(p && Array.isArray(p.finishes) && p.finishes.length); }
function finishById(p, id) { return usesFinishes(p) ? (p.finishes.find(f => f.id === id) || p.finishes[0]) : null; }
function priceKey(opts) { const o = opts || {}; return (o.culoare || '') + '|' + (o.grosime || ''); }

function productOptions(p) {
  if (!p) return [];
  if (usesFinishes(p)) {
    const g = ['finisaj'];
    if (p.finishes.some(f => (f.colors || []).length)) g.push('culoare');
    if (p.finishes.some(f => (f.thicknesses || []).length)) g.push('grosime');
    return g;
  }
  if (Array.isArray(p.options)) return p.options;
  // Axele de opțiuni ale categoriei (din categoria editabilă, altfel din maparea implicită).
  const cat = getCategory(p.cat);
  if (cat && Array.isArray(cat.options) && cat.options.length) return cat.options;
  return CATEGORY_OPTIONS[p.cat] || [];
}
function defaultOpts(p) {
  if (usesFinishes(p)) {
    const f = p.finishes[0]; const o = { finisaj: f.id };
    if ((f.colors || []).length) o.culoare = f.colors[0];
    if ((f.thicknesses || []).length) o.grosime = f.thicknesses[0];
    return o;
  }
  const o = {};
  for (const g of productOptions(p)) {
    const def = OPTIONS[g];
    if (def && def.values.length) { const base = def.values.find(v => !v.delta) || def.values[0]; o[g] = base.id; }
  }
  return o;
}
function optionValue(group, id) { const def = OPTIONS[group]; return def ? def.values.find(v => v.id === id) : null; }
function optionValueName(group, id) { const v = optionValue(group, id); return v ? v.name : id; }
function optionDelta(p, group, id) {
  if (p && p.optionPrices) { const v = p.optionPrices[group + ':' + id]; if (typeof v === 'number') return v; }
  const gv = optionValue(group, id); return gv && typeof gv.delta === 'number' ? gv.delta : 0;
}

// Prețul variantei. Cu finisaje: preț ABSOLUT din matricea finisajului.
function optionPrice(p, opts) {
  const o = opts || {};
  if (usesFinishes(p)) {
    const f = finishById(p, o.finisaj);
    const v = f && f.prices ? f.prices[priceKey(o)] : undefined;
    return typeof v === 'number' ? v : (Number(p.price) || 0);
  }
  let price = (o.culoare && p.colorPrices && typeof p.colorPrices[o.culoare] === 'number') ? p.colorPrices[o.culoare] : p.price;
  for (const g of Object.keys(o)) { if (g === 'culoare') continue; price += optionDelta(p, g, o[g]); }
  return price;
}
function displayPrice(p) { return optionPrice(p, defaultOpts(p)); }
// Prețul minim al produsului („de la") și dacă prețul variază între combinații.
function priceMin(p) {
  if (!p) return 0;
  const vals = [];
  if (usesFinishes(p)) p.finishes.forEach(f => { const pr = f.prices || {}; for (const k in pr) if (typeof pr[k] === 'number') vals.push(pr[k]); });
  if (p.colorPrices) Object.values(p.colorPrices).forEach(x => { if (typeof x === 'number') vals.push(x); });
  if (typeof p.price === 'number') vals.push(p.price);
  return vals.length ? Math.min(...vals) : 0;
}
function priceVaries(p) {
  const set = new Set();
  if (p && usesFinishes(p)) p.finishes.forEach(f => { const pr = f.prices || {}; for (const k in pr) if (typeof pr[k] === 'number') set.add(pr[k]); });
  if (p && p.colorPrices) Object.values(p.colorPrices).forEach(x => { if (typeof x === 'number') set.add(x); });
  if (!set.size && p && typeof p.price === 'number') set.add(p.price);
  return set.size > 1;
}
// Categorii fără preț afișat (preț „la cerere"): folii/membrane și șuruburi.
const PRICELESS_CATS = ['folii-membrane', 'suruburi'];
function isPriceless(p) { return !!(p && PRICELESS_CATS.includes(p.cat)); }
// Prețul maxim al produsului (pentru afișarea intervalului la produsele configurabile).
function priceMax(p) {
  if (!p) return 0;
  const vals = [];
  if (usesFinishes(p)) p.finishes.forEach(f => { const pr = f.prices || {}; for (const k in pr) if (typeof pr[k] === 'number') vals.push(pr[k]); });
  if (p.colorPrices) Object.values(p.colorPrices).forEach(x => { if (typeof x === 'number') vals.push(x); });
  if (typeof p.price === 'number') vals.push(p.price);
  return vals.length ? Math.max(...vals) : 0;
}
// HTML pentru prețul de pe card. Prețurile se afișează mereu ca „de la …" (nu fixe).
// Dacă prețul variază, se arată intervalul „de la MIN – MAX". Categoriile fără preț: „Preț la cerere".
function cardPrice(p) {
  if (isPriceless(p)) return '<span class="price-req">Preț la cerere</span>';
  const lo = priceMin(p), hi = priceMax(p);
  const body = hi > lo ? (formatPrice(lo).replace(/\s*lei$/, '') + ' – ' + formatPrice(hi)) : formatPrice(lo);
  return '<span class="price-from">de la </span>' + body;
}
// Alias-uri de brand pentru afișare (ex. WTB → Wetterbest).
const BRAND_ALIASES = { 'wtb': 'Wetterbest' };
// Numele de brand formatat frumos pentru afișare (respectă alias-urile).
function brandDisplay(s) {
  const raw = (s == null ? '' : String(s)).trim();
  if (!raw) return '';
  const alias = BRAND_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  return raw.split(/\s+/).map(w => (w.length <= 3 && w === w.toUpperCase()) ? w : (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ');
}

// Eticheta axei „finisaj" pentru un produs (poate fi personalizată, ex. „Model acoperiș").
function finishAxisLabel(p) { return (p && p.finishLabel) ? p.finishLabel : 'Finisaj'; }
// Finisajele produsului (obiecte {id,name}) pentru pagina produsului
function finishList(p) {
  if (usesFinishes(p)) return p.finishes.map(f => ({ id: f.id, name: optionValueName('finisaj', f.id) }));
  return OPTIONS.finisaj.values;
}
// Culorile disponibile pentru un finisaj (obiecte {id,name,hex})
function finishColorValues(p, finishId) {
  if (usesFinishes(p)) {
    const f = finishById(p, finishId); if (!f) return [];
    return (f.colors || []).map(id => optionValue('culoare', id) || { id, name: id, hex: '#ccc' });
  }
  const all = OPTIONS.culoare.values;
  if (Array.isArray(p && p.colors) && p.colors.length) return all.filter(v => p.colors.includes(v.id));
  const fc = p && p.finishColors && p.finishColors[finishId];
  return (Array.isArray(fc) && fc.length) ? all.filter(v => fc.includes(v.id)) : all;
}
// Grosimile disponibile pentru un finisaj (obiecte {id,name})
function finishThicknessValues(p, finishId) {
  if (usesFinishes(p)) {
    const f = finishById(p, finishId); if (!f) return [];
    return (f.thicknesses || []).map(id => optionValue('grosime', id) || { id, name: id });
  }
  return OPTIONS.grosime.values;
}
/* Rezumat scurt al opțiunilor pentru coș (ex. „Antracit · 0.50 mm · Poliester mat") */
function optionSummary(opts) {
  const o = opts || {};
  return Object.keys(o).map(g => optionValueName(g, o[g]).split(' · ')[0]).join(' · ');
}

/* ── ÎNCĂRCARE CATALOG DIN API (D1), cu fallback pe catalogul static ─────────
   Dacă /api/products întoarce produse (baza D1 e configurată și populată),
   acestea înlocuiesc catalogul static, ca editările din admin să apară pe site.
   Dacă API-ul lipsește sau întoarce listă goală, rămâne catalogul static. */
function defaultProductSvg(p) {
  // Placeholder curat pe fundal alb (fără schița colorată din cod). Apare doar
  // când produsul nu are o poză reală încărcată; se înlocuiește automat cu poza.
  return `<svg viewBox="0 0 400 300" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${(p && p.name) ? String(p.name).replace(/[<>&"]/g, '') : 'Produs'}">
    <rect width="400" height="300" fill="#ffffff"/>
  </svg>`;
}
// Încarcă valorile globale de opțiuni din API (finisaje/grosimi/culori) și le
// aplică peste cele implicite, ca proprietățile adăugate din admin să apară.
let OPTIONS_READY = null;
function loadOptions() {
  if (OPTIONS_READY) return OPTIONS_READY;
  OPTIONS_READY = (async () => {
    try {
      const res = await fetch('/api/options', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        for (const g of Object.keys(data || {})) {
          if (OPTIONS[g] && Array.isArray(data[g]) && data[g].length) OPTIONS[g].values = data[g];
        }
      }
    } catch (e) { /* fallback pe valorile implicite */ }
    return OPTIONS;
  })();
  return OPTIONS_READY;
}

let CATALOG_READY = null;
// Încarcă categoriile editabile din admin (D1). Fallback: categoriile implicite.
let CATEGORIES_READY = null;
function loadCategories() {
  if (CATEGORIES_READY) return CATEGORIES_READY;
  CATEGORIES_READY = (async () => {
    try {
      const res = await fetch('/api/categories', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length) {
          // păstrează iconițele implicite dacă lipsesc din DB
          const byId = {}; CATEGORIES.forEach(c => byId[c.id] = c);
          CATEGORIES = list.map(c => ({ ...c, icon: c.icon || (byId[c.id] && byId[c.id].icon) || 'accesoriu' }));
        }
      }
    } catch (e) { /* fără API → rămân categoriile implicite */ }
    return CATEGORIES;
  })();
  return CATEGORIES_READY;
}
function loadCatalog() {
  if (CATALOG_READY) return CATALOG_READY;
  CATALOG_READY = (async () => {
    await loadCategories();
    await loadOptions();
    try {
      const res = await fetch('/api/products', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length) {
          // păstrează ilustrațiile SVG (nu vin din DB): din catalogul static sau default
          const staticSvg = {};
          PRODUCTS.forEach(p => { staticSvg[p.id] = p.svg; });
          list.forEach(p => { if (!p.svg) p.svg = staticSvg[p.id] || defaultProductSvg(p); });
          PRODUCTS = list;
        }
      }
    } catch (e) { /* fără API / offline → rămâne catalogul static */ }
    // Catalogul e disponibil → reîmprospătează totalul din butonul de coș
    try { document.dispatchEvent(new CustomEvent('cart:change')); } catch (e) {}
    return PRODUCTS;
  })();
  return CATALOG_READY;
}
