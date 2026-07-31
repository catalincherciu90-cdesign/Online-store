-- Acoperiș PRO — schema bazei de date (Cloudflare D1)
-- Rulează o singură dată la setup:
--   wrangler d1 execute acoperispro-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS products (
  id         TEXT PRIMARY KEY,
  cat        TEXT NOT NULL,
  name       TEXT NOT NULL,
  price      REAL NOT NULL,
  unit       TEXT NOT NULL DEFAULT 'buc',
  badge      TEXT,
  descr      TEXT,
  producator TEXT,         -- numele producătorului / brandului
  specs         TEXT,         -- JSON { cheie: valoare }
  options       TEXT,         -- JSON array de grupuri, sau NULL = implicit pe categorie
  option_prices TEXT,         -- JSON { "grup:valoare": delta } delte finisaj/grosime
  finish_colors TEXT,         -- JSON { "finisaj": ["culoare",...] } culori per finisaj
  color_prices  TEXT,         -- (vechi) JSON { "culoare": pret }
  finishes      TEXT,         -- JSON [{ id, colors:[..], thicknesses:[..], prices:{"cul|gros":pret} }]
  active        INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ref        TEXT UNIQUE,
  nume       TEXT, prenume TEXT, telefon TEXT, email TEXT,
  adresa     TEXT, oras TEXT, judet TEXT, obs TEXT,
  items      TEXT,            -- JSON [{nume, optiuni, cant, unit, pret}]
  total      REAL,
  status     TEXT DEFAULT 'nou',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ref        TEXT UNIQUE,
  nume       TEXT, telefon TEXT, email TEXT,
  tip        TEXT, suprafata TEXT, mesaj TEXT,
  plan       TEXT,            -- nume/info fișier plan
  status     TEXT DEFAULT 'nou',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Blog (articole) — afișate pe pagina blog.html, editabile din admin
CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT UNIQUE,
  title      TEXT NOT NULL,
  excerpt    TEXT,             -- rezumat scurt
  content    TEXT,             -- conținutul articolului (text, paragrafe)
  image      TEXT,             -- imagine copertă (data URL)
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Administratori suplimentari (parole hash-uite PBKDF2). Contul principal e din env.
CREATE TABLE IF NOT EXISTS admins (
  username   TEXT PRIMARY KEY,
  pass_hash  TEXT NOT NULL,
  pass_salt  TEXT NOT NULL,
  name       TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Setări site (logo magazin + date de contact) — cheie/valoare
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Producători (nume + logo) pentru banda de branduri și paginile de produs
CREATE TABLE IF NOT EXISTS producers (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,               -- data URL (base64) al logo-ului
  sort INTEGER DEFAULT 0
);

-- Bannere hero (slider pe prima pagină, editabile din admin)
CREATE TABLE IF NOT EXISTS banners (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT,
  subtitle   TEXT,
  cta_label  TEXT,            -- textul butonului
  cta_href   TEXT,            -- linkul butonului
  image      TEXT,            -- data URL (base64) al imaginii
  align      TEXT DEFAULT 'left',  -- poziția textului: left | center | right
  height     TEXT DEFAULT 'md',    -- înălțime: sm | md | lg
  sort       INTEGER DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Recenzii clienți (afișate pe prima pagină, editabile din admin)
CREATE TABLE IF NOT EXISTS reviews (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  author   TEXT NOT NULL,           -- numele clientului
  rating   INTEGER NOT NULL DEFAULT 5,  -- 1..5 stele
  text     TEXT NOT NULL,           -- textul recenziei
  source   TEXT DEFAULT 'Google',   -- sursa (Google, Facebook, Site etc.)
  sort     INTEGER DEFAULT 0,       -- ordine de afișare
  active   INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Valori globale de opțiuni (finisaje / grosimi / culori) editabile din admin
CREATE TABLE IF NOT EXISTS option_values (
  grp   TEXT NOT NULL,        -- 'finisaj' | 'grosime' | 'culoare'
  id    TEXT NOT NULL,
  name  TEXT NOT NULL,
  delta REAL DEFAULT 0,       -- diferență de preț implicită
  hex   TEXT,                 -- doar pentru culoare
  sort  INTEGER DEFAULT 0,
  PRIMARY KEY (grp, id)
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(cat);
