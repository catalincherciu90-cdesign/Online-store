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
  specs         TEXT,         -- JSON { cheie: valoare }
  options       TEXT,         -- JSON array de grupuri, sau NULL = implicit pe categorie
  option_prices TEXT,         -- JSON { "grup:valoare": delta } prețuri per opțiune
  finish_colors TEXT,         -- JSON { "finisaj": ["culoare",...] } culori per finisaj
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
