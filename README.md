# SFF Customer Store

Independent PWA storefront. It does not connect to or modify SFF ERP.

## Included
- Product catalog, search and category filter
- Retail prices PC / PAC / BOX and pack quantities
- Cart, quantity controls and subtotal by currency
- Customer details, delivery or pickup, address and notes
- WhatsApp order handoff
- PWA manifest and service worker

## Setup
1. Edit `config.js`; set `WHATSAPP_NUMBER` in international format, digits only (Lebanon: 961...).
2. Import SFF backup data into `data/products.json` using a separate importer.
3. Store images in the site folder and set each product `image` to its relative path.
4. Publish on HTTPS (e.g. GitHub Pages) to enable PWA installation.

## Product JSON example
`{"id":"10025","name":"Olive Oil 1L","code":"10025","barcode":"5281234567890","category":"Grocery","currency":"USD","image":"images/10025.jpg","prices":{"pc":5,"pac":28,"box":110},"pack_sizes":{"pac":6,"box":24}}`

Only retail prices are displayed. No wholesale price or stock quantity is displayed. Sample values are illustrative, not SFF data.

WhatsApp opens a prefilled message; customer must press Send. Delivery fee is confirmed by staff. This starter does not store orders in a backend. A real importer requires inspection of an SFF backup and image structure. Never use a live database or credentials.

## Logo
Replace `assets/store-logo.png` with your transparent supermarket logo using the same filename. The logo is displayed large at the top; the separate Shop SFF Products hero card has been removed. Search matches product name and category only.

## Cloudflare backend (new Admin + orders)
The repository now includes `admin.html` and `cloudflare/worker.js` with a Cloudflare D1 schema and R2 image bucket configuration. The frontend stays on GitHub Pages; the Worker/D1/R2 backend is separate from SFF ERP and Supabase.

### Deploy (one-time setup)
1. Install Node.js and Wrangler, then sign in: `npm install -g wrangler` and `wrangler login`.
2. In Cloudflare, create a D1 database named `aytroun-store` and an R2 bucket named `aytroun-store-images`.
3. Put the real D1 database ID into `cloudflare/wrangler.toml`; set `ALLOWED_ORIGIN` to the exact GitHub Pages origin (for example `https://USERNAME.github.io`).
4. From the `cloudflare` folder run `wrangler d1 execute aytroun-store --remote --file=schema.sql`.
5. Set secrets: `wrangler secret put ADMIN_PASSWORD` and `wrangler secret put JWT_SECRET` (use a long random secret for JWT_SECRET).
6. Deploy: `wrangler deploy`. Copy the Worker URL into `API_URL` in `config.js` (replace `https://YOUR-WORKER.workers.dev`).
7. Publish the repository to GitHub Pages. Open `/admin.html` to sign in.

### Included now
- Protected Admin API login (12-hour signed token), product create/update/delete, product image upload to R2.
- Store name, WhatsApp phone, language preference, address and logo settings.
- Delivery area fee management.
- Orders are saved in D1; Admin can update order status.
- JSON export/restore for products, settings and delivery areas.
- Customer checkout saves an order in D1, calculates the chosen area's fee, and opens WhatsApp with a prefilled order message.

### Important limitations / next integration
- WhatsApp `wa.me` only opens a prefilled message. It does not automatically send messages, deliver interactive “Delivered” buttons, or receive a customer's confirmation. That requires a Meta WhatsApp Business Platform app, verified phone number, approved message templates, webhook URL and credentials. Those credentials must be configured by the store owner; none are included here.
- The language setting currently changes the document language/direction metadata; a full Arabic/English translation of all storefront and Admin labels remains to be completed.
- The backup JSON includes image URLs, not the binary image files in R2. R2 retains the actual images independently.
- The current ZIP did not include an actual SFF backup/catalog. Therefore the importer for the real SFF backup and its product images is not implemented or validated. Existing `data/products.json` remains an empty placeholder. Add/edit products manually in Admin for now, or provide a sanitized SFF backup/export for a proper read-only adapter.
- Cloudflare Worker R2 object URLs are served by the same Worker route. Configure the GitHub Pages origin and custom-domain CORS policy for production before public launch; the sample Worker currently uses permissive CORS headers for setup convenience.
- This project does not connect to, write to, or modify SFF ERP.
