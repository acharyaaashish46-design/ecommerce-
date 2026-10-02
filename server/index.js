import express from "express";
import cors from "cors";
import { load, persist, validateProduct, DB_PATH } from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;

const db = load();

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

// ---- Health ----
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", products: db.products.length, orders: db.orders.length, db: DB_PATH });
});

// ---- Categories (derived from stored products) ----
app.get("/api/categories", (_req, res) => {
  const categories = [...new Set(db.products.map((p) => p.category))].sort();
  res.json(categories);
});

// =====================================================
//  PRODUCTS — CRUD
// =====================================================

// READ (list) — supports ?search=, ?category=, ?sort=price_asc|price_desc|rating|name
app.get("/api/products", (req, res) => {
  const { search, category, sort } = req.query;
  let result = [...db.products];

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
    );
  }

  if (category && category !== "All") {
    result = result.filter((p) => p.category === category);
  }

  switch (sort) {
    case "price_asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "name":
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }

  res.json(result);
});

// READ (single)
app.get("/api/products/:id", (req, res) => {
  const product = db.products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: `Product ${req.params.id} not found` });
  res.json(product);
});

// CREATE
app.post("/api/products", (req, res) => {
  const { error, value } = validateProduct(req.body || {});
  if (error) return res.status(400).json({ error });

  const product = {
    id: db.nextProductId++,
    name: value.name,
    category: value.category,
    price: value.price,
    stock: value.stock,
    rating: value.rating ?? 0,
    image:
      value.image ??
      "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&q=80",
    description: value.description ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.products.push(product);
  persist();
  res.status(201).json(product);
});

// UPDATE (full/partial — merges supplied fields)
app.put("/api/products/:id", (req, res) => {
  const product = db.products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: `Product ${req.params.id} not found` });

  const { error, value } = validateProduct(req.body || {}, { partial: true });
  if (error) return res.status(400).json({ error });

  Object.assign(product, value, { updatedAt: new Date().toISOString() });
  persist();
  res.json(product);
});

// DELETE
app.delete("/api/products/:id", (req, res) => {
  const index = db.products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: `Product ${req.params.id} not found` });

  const [removed] = db.products.splice(index, 1);
  persist();
  res.json({ success: true, removed: { id: removed.id, name: removed.name } });
});

// =====================================================
//  ORDERS
// =====================================================

// List orders
app.get("/api/orders", (_req, res) => {
  res.json(db.orders);
});

// Place an order: { items: [{ id, quantity }] }
app.post("/api/orders", (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order must include at least one item" });
  }

  const lineItems = [];
  for (const item of items) {
    const product = db.products.find((p) => p.id === Number(item.id));
    const quantity = Number(item.quantity);
    if (!product) return res.status(404).json({ error: `Product ${item.id} not found` });
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: `Invalid quantity for ${product.name}` });
    }
    if (product.stock < quantity) {
      return res.status(409).json({ error: `Not enough stock for ${product.name}` });
    }
    lineItems.push({ id: product.id, name: product.name, price: product.price, quantity });
  }

  for (const line of lineItems) {
    const product = db.products.find((p) => p.id === line.id);
    product.stock -= line.quantity;
    product.updatedAt = new Date().toISOString();
  }

  const total = lineItems.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const order = {
    id: db.nextOrderId++,
    items: lineItems,
    total: Number(total.toFixed(2)),
    createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  persist();
  res.status(201).json(order);
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Express v5 handles errors; add explicit JSON error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log(`Database file: ${DB_PATH}`);
});
