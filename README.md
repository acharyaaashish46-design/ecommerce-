# ShopReact — E-commerce Demo (Node.js + React)

A small but complete e-commerce storefront:

- **Backend:** Express REST API with 12 seeded products, search, category filter, sorting and an order/checkout endpoint.
- **Frontend:** React (Vite) storefront with product grid, featured section, live search/filter/sort, slide-out cart and checkout.

## Quick start

```bash
# 1. Install everything (root + server + client)
npm install && npm run install:all

# 2. Run both backend and frontend together
npm run dev
```

Then open **http://localhost:5173**

Or run them separately in two terminals:

```bash
npm run dev:server   # API on http://localhost:5000
npm run dev:client   # Web on http://localhost:5173
```

## Project structure

```
├── server/            # Express API
│   ├── index.js       # CRUD routes
│   ├── db.js          # file-backed datastore + validation
│   └── data/
│       ├── db.json    # persistent data (created on first run)
│       └── products.js  # seed product data
├── client/            # React + Vite
│   └── src/
│       ├── App.jsx    # router + nav
│       ├── Shop.jsx   # storefront UI
│       ├── Admin.jsx  # product CRUD (entry + view)
│       └── styles.css
└── package.json       # runs both with `npm run dev`
```

## Pages

| Page | URL |
| --- | --- |
| Storefront (browse, cart, checkout) | http://localhost:5173/ |
| **Admin — product CRUD (entry + view)** | **http://localhost:5173/admin** |

## API endpoints

**Products — full CRUD**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products` | List — `?search=&category=&sort=price_asc\|price_desc\|rating\|name` |
| GET | `/api/products/:id` | Read one |
| POST | `/api/products` | **Create** — `{ name, category, price, stock, rating?, image?, description? }` |
| PUT | `/api/products/:id` | **Update** — sends only the fields to change |
| DELETE | `/api/products/:id` | **Delete** |

**Other**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Server status |
| GET | `/api/categories` | Distinct categories |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Place order — `{ "items": [{ "id": 1, "quantity": 2 }] }` |

Example:

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"New Gadget","category":"Electronics","price":49.99,"stock":25}'

curl -X PUT http://localhost:5000/api/products/1 \
  -H "Content-Type: application/json" -d '{"price":99.5}'

curl -X DELETE http://localhost:5000/api/products/1

# valid: 400 (validation), 404 (not found), 409 (insufficient stock)
```

## Storage (real, not dummy)

Products and orders persist to **`server/data/db.json`** (atomic tmp-file + rename writes).
The file is seeded from `server/data/products.js` on first run, then everything you
create/edit/delete lives in the file — data survives server restarts. Delete the file
to re-seed.

## Notes

- The Vite dev server proxies `/api` to `http://localhost:5000`, so no CORS issues in development.
- Data persists to `server/data/db.json` — swap the store in `server/db.js` for SQLite/Postgres when you outgrow a file.
- Production build: `npm run build --prefix client` → `client/dist`.
