-- Run once in the Aytroun D1 database console. Safe: creates indexes only.
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_barcode_pac ON products(barcode_pac);
CREATE INDEX IF NOT EXISTS idx_products_barcode_box ON products(barcode_box);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
