# Acoperiș PRO — Magazin online sisteme de acoperiș

Magazin online (frontend static) pentru vânzarea de **sisteme de acoperiș**:
țiglă metalică, tablă fălțuită, panouri sandwich, sistem pluvial, accesorii de
montaj și folii/membrane.

Site-ul este 100% static (HTML + CSS + JavaScript vanilla), fără build step și
fără dependențe externe — se poate deploya direct pe **Cloudflare Pages**,
GitHub Pages, Netlify sau orice hosting static.

## Funcționalități

- 🏠 **Pagină principală** cu hero, categorii, produse recomandate și secțiune „de ce noi”
- 🧱 **Catalog** (`produse.html`) cu filtrare pe categorie și preț + sortare
- 🔍 **Pagină de produs** (`produs.html`) cu specificații, selector de cantitate și produse similare
- 🛒 **Coș de cumpărături** persistent în `localStorage` (`cos.html`)
- 💳 **Checkout** cu formular de livrare și confirmare comandă (plată ramburs, demo)
- ✉️ **Contact / cere ofertă** (`contact.html`)
- 📱 Design **responsive** (desktop / tabletă / mobil)

## Structura proiectului

```
Online-store/
├── index.html          # Pagina principală
├── produse.html        # Catalog cu filtre
├── produs.html         # Detaliu produs (?id=...)
├── cos.html            # Coș + checkout
├── contact.html        # Contact / cerere ofertă
├── assets/
│   ├── css/style.css   # Stiluri globale
│   └── js/
│       ├── data.js     # Catalog produse + categorii + ilustrații SVG
│       ├── cart.js     # Logica coșului (localStorage)
│       └── main.js     # UI comun (meniu mobil, toast)
├── _headers            # Headere de securitate pentru Cloudflare Pages
└── README.md
```

## Rulare locală

Nu necesită build. Servește folderul cu orice server static:

```bash
# Python
python3 -m http.server 8080

# sau Node
npx serve .
```

Apoi deschide <http://localhost:8080>.

## Deploy pe Cloudflare Pages

1. Conectează repo-ul în Cloudflare Pages.
2. **Build command:** *(lasă gol)*
3. **Build output directory:** `/` (rădăcina repo-ului)
4. Deploy.

## Catalogul de produse

Produsele sunt definite în `assets/js/data.js` (array-ul `PRODUCTS`). Fiecare
produs are: `id`, `cat` (categorie), `name`, `price`, `unit`, `desc`, `specs`
și o ilustrație SVG. Poți adăuga/edita produse direct în acest fișier, fără să
modifici restul aplicației.

Ilustrațiile produselor sunt **SVG generate în cod** (fără imagini externe),
astfel încât site-ul rămâne ușor și fără dependențe.

## Pași următori (producție)

Acest MVP folosește date statice și simulează plasarea comenzii pe client.
Pentru un magazin real:

- Conectează un **backend** (ex. Cloudflare Worker + D1) pentru comenzi și stoc
  — vezi ca referință API-ul din repo-ul `ai-agenti` (`projects/anxio-api`).
- Trimite comenzile/ofertele pe email (ex. Resend) sau într-o bază de date.
- Integrează o metodă de **plată online** (Stripe / Netopia).
- Adaugă imagini reale de produs în locul ilustrațiilor SVG.

---
Prețurile din catalog sunt orientative (demo) și includ TVA.
