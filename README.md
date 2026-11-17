# Aytroun Grand SuperMarket

Independent customer storefront and admin portal. The app uses GitHub Pages for the public site and a Cloudflare Worker + D1 + R2 for backend services.

## Important safety boundary
This project is separate from SFF ERP. It does not connect to, read from, or modify the live SFF database. Product import from an SFF backup is not implemented until a real sanitized backup/export is inspected.

## Files
- `index.html`: customer storefront
- `admin.html`: admin interface
- `config.js`: public API endpoint and WhatsApp destination
- `cloudflare/worker.js`: Cloudflare Worker API
- `cloudflare/schema.sql`: D1 database schema
- `cloudflare/wrangler.toml`: Worker deployment configuration

See `START-HERE-AR.txt` for setup steps in Arabic.
