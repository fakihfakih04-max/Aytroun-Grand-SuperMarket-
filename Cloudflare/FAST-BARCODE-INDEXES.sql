-- Run once in the Aytroun D1 database console for fast exact barcode lookup.
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_barcode_pac ON products(barcode_pac);
CREATE INDEX IF NOT EXISTS idx_products_barcode_box ON products(barcode_box);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
