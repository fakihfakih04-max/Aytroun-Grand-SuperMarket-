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
