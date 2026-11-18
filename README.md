# Aytroun Grand SuperMarket

Independent customer storefront and admin portal.

- GitHub Pages hosts the public store (`index.html`) and admin (`admin.html`).
- Cloudflare Worker + D1 stores products, orders, delivery areas, settings, and compressed image data.
- **R2 is not required. No payment card or R2 subscription is needed for this version.**
- Product and logo images are resized/compressed in the browser and stored as data URLs in D1. Use reasonably sized images; the admin enforces a 500 KB encoded limit per image.

## Safety boundary
This project is separate from SFF ERP. It does not connect to, read from, or modify the live SFF database. Importing a raw SFF backup is not implemented until a real sanitized backup/export is inspected.

## Files
- `index.html`: customer storefront
- `admin.html`: admin portal
- `config.js`: public API endpoint and WhatsApp destination
- `Cloudflare/worker.js`: Worker API (deploy this version)
- `Cloudflare/schema.sql`: D1 schema

## Existing Cloudflare setup
- Worker: `aytroun-api`
- Worker URL: `https://aytroun-api.fakihfakih04.workers.dev`
- D1 database binding: `DB` -> `aytroun-db`
- Worker secrets: `ADMIN_PASSWORD` and `JWT_SECRET`

## Update steps
1. Replace the repository files with the contents of this ZIP and commit to branch `main`.
2. In Cloudflare Workers & Pages > `aytroun-api` > Edit code, replace `worker.js` with `Cloudflare/worker.js`, then Deploy. Keep the existing `DB` binding and the two Secrets.
3. Do not create an R2 bucket or add an `IMAGES` binding.
4. Open `https://YOUR-GITHUB-PAGES-URL/admin.html` and sign in with the `ADMIN_PASSWORD` secret.

## Admin features
- Add/edit/delete products; retail PC/PAC/BOX prices; pieces per PAC/BOX; category, code, barcode and image.
- Store name, WhatsApp number, language, address and logo.
- Delivery areas with a fee and currency per area.
- View orders and update statuses.
- JSON backup/restore of products, settings, areas and embedded images.

## Important limitations
- WhatsApp checkout opens a prefilled WhatsApp message; the customer must press Send.
- Automatic WhatsApp messages and automatic delivery-receipt replies require WhatsApp Business Platform/API setup. The current admin can manage order statuses manually.
- The JSON backup does not include order history.
- Import from a real SFF backup requires inspecting a sanitized backup/export first.
