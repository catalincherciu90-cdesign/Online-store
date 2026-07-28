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
- ✉️ **Contact / cere ofertă cu încărcare plan** (`contact.html`) — vezi mai jos
- 🖼️ **Import imagini** (`import.html`) — panou admin pentru încărcat poze reale din browser (vezi mai jos)
- 📱 Design **responsive** (desktop / tabletă / mobil)

## Import imagini (panou admin)

Pagina `import.html` (link în footer: „⚙ Import imagini") permite încărcarea
pozelor reale direct din browser, fără cod:

1. Deschide `/import.html`.
2. Pentru fiecare produs/categorie, apasă **„Alege poză"** și selectează imaginea.
   Poza apare imediat în tot magazinul.
3. Pozele se salvează local, în **IndexedDB** (browserul curent) — ideal pentru
   a prezenta macheta unui client de pe acest calculator.
4. Pentru a face pozele **permanente și vizibile tuturor vizitatorilor**, apasă
   **„Exportă pozele pentru repo"**: se descarcă fișierele cu numele corecte, pe
   care le comiți în `assets/img/products/` și `assets/img/categories/`.

Ordinea de afișare a fiecărei imagini: 1) poză din IndexedDB (încărcată în import),
2) fișier din repo (`assets/img/...`), 3) ilustrație SVG (fallback automat).

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

## Cerere de ofertă cu încărcare plan

Formularul din `contact.html` permite trimiterea unei cereri de ofertă cu un
**plan atașat** (PDF / JPG / PNG / DWG / DXF, max. 15 MB). Cererea este procesată
de o **Cloudflare Pages Function**: `functions/api/quote.js` → ruta `POST /api/quote`.

Funcția validează datele, (opțional) arhivează planul în R2 și trimite un email
către firmă prin [Resend](https://resend.com), cu planul atașat.

### Configurare (Cloudflare Pages → Settings → Environment variables)

| Variabilă | Rol |
|---|---|
| `RESEND_API_KEY` | Cheia API de la resend.com (necesară pentru trimiterea email-ului) |
| `QUOTE_TO_EMAIL` | Adresa unde primești cererile (ex. `oferte@firma.ro`) |
| `QUOTE_FROM` | *(opțional)* Expeditor verificat în Resend. Implicit `Acoperis PRO <onboarding@resend.dev>` |

Opțional, poți lega un **bucket R2** cu numele `PLANS` (Settings → Functions →
R2 bindings) pentru a arhiva automat planurile încărcate.

Până când `RESEND_API_KEY` + `QUOTE_TO_EMAIL` sunt setate, cererile sunt
acceptate și apar în **Functions → Real-time logs**, dar nu se trimite email.

## Produse configurabile (finisaj / grosime / culoare)

Pe pagina produsului, clientul alege opțiuni (definite în `assets/js/data.js` →
`OPTIONS` + `CATEGORY_OPTIONS`), prețul se actualizează live, iar fiecare
combinație devine o linie separată în coș. Catalogul (`produse.html`) are filtre
de grosime și culoare disponibilă.

**Imagine per culoare (opțional):** dacă adaugi un fișier
`assets/img/products/<id-produs>__<id-culoare>.jpg`
(ex. `tm-clasic-05__ral7016.jpg`), imaginea produsului se schimbă când clientul
selectează acea culoare. Dacă nu există, rămâne imaginea de bază. ID-urile de
culoare: `ral8004, ral7016, ral9005, ral8017, ral3011, ral6005, ral9006, ral9002`.

## Comenzi (checkout)

Finalizarea comenzii din `cos.html` trimite datele + liniile (cu opțiunile
alese) către **Cloudflare Pages Function** `functions/api/order.js`
(`POST /api/order`), care trimite un email de comandă prin Resend.

Variabile de mediu: `RESEND_API_KEY`, `ORDER_TO_EMAIL` (fallback
`QUOTE_TO_EMAIL`), `QUOTE_FROM` (opțional). Fără ele, comanda e acceptată ca
demo (ramburs) și apare în Functions → Real-time logs.

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
