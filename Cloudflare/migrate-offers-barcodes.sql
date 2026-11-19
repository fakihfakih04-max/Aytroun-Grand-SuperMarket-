-- Run once in Cloudflare D1 Console for aytroun-db
ALTER TABLE products ADD COLUMN barcode_pac TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN barcode_box TEXT DEFAULT '';
CREATE TABLE IF NOT EXISTS offers (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL, title TEXT DEFAULT 'عرض يومي',
 offer_price REAL NOT NULL, start_date TEXT DEFAULT '', end_date TEXT DEFAULT '',
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offers_active_dates ON offers(active,start_date,end_date);
