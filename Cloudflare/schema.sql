CREATE TABLE IF NOT EXISTS products (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, code TEXT, barcode TEXT, barcode_pac TEXT DEFAULT '', barcode_box TEXT DEFAULT '',
 currency TEXT DEFAULT 'USD', image TEXT, pc REAL, pac REAL, box REAL,
 pac_qty INTEGER, box_qty INTEGER, description TEXT, quantity REAL DEFAULT 0, available INTEGER DEFAULT 1, unit_type TEXT NOT NULL DEFAULT 'PC', weight_mode TEXT NOT NULL DEFAULT 'customer', is_visible INTEGER NOT NULL DEFAULT 1, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS delivery_areas (id TEXT PRIMARY KEY, name TEXT NOT NULL, fee REAL NOT NULL, currency TEXT DEFAULT 'USD');
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, phone TEXT NOT NULL, method TEXT NOT NULL,
 area TEXT, address TEXT, notes TEXT, items_json TEXT NOT NULL, subtotal_json TEXT NOT NULL,
 delivery_fee REAL DEFAULT 0, delivery_currency TEXT DEFAULT 'USD', total_json TEXT,
 status TEXT DEFAULT 'new', created_at TEXT DEFAULT CURRENT_TIMESTAMP, delivered_confirmed_at TEXT
);
INSERT OR IGNORE INTO settings(key,value) VALUES ('store_name','Aytroun Grand SuperMarket'),('phone','96171905974'),('language','en'),('address',''),('logo','assets/store-logo.png');

CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, title TEXT DEFAULT 'عرض يومي', offer_price REAL NOT NULL, start_date TEXT DEFAULT '', end_date TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE);
