-- Run once in Cloudflare D1 Console. Adds per-product storefront visibility.
ALTER TABLE products ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 1;
