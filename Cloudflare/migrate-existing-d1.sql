-- Run this ONCE in Cloudflare D1 Console for the database already created.
ALTER TABLE products ADD COLUMN description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN quantity REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN available INTEGER DEFAULT 1;
