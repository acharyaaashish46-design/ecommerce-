import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { products as seedProducts } from "./data/products.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, "data", "db.json");

function freshDb() {
  return {
    products: seedProducts.map((p) => ({ ...p })),
    orders: [],
    nextProductId: Math.max(0, ...seedProducts.map((p) => p.id)) + 1,
    nextOrderId: 1
  };
}

let db = null;

/** Load the database from disk (seeded on first run). */
export function load() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    if (!db || !Array.isArray(db.products)) throw new Error("corrupt db");
  } catch {
    db = freshDb();
    persist();
  }
  return db;
}

/** Write the database to disk atomically (tmp file + rename). */
export function persist() {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

/** Reset (used by tests). */
export function reset() {
  db = freshDb();
  persist();
  return db;
}

/**
 * Validate a product payload.
 * Returns { error } or { value } with normalized fields.
 * When `partial` is true, only supplied fields are checked (for PATCH/PUT merge).
 */
export function validateProduct(body, { partial = false } = {}) {
  const value = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return { error: "name is required and must be a non-empty string" };
    }
    value.name = body.name.trim();
    if (value.name.length > 150) return { error: "name must be 150 characters or fewer" };
  }

  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "price must be a number >= 0" };
    }
    value.price = Number(price.toFixed(2));
  }

  if (!partial || body.category !== undefined) {
    if (typeof body.category !== "string" || body.category.trim().length === 0) {
      return { error: "category is required and must be a non-empty string" };
    }
    value.category = body.category.trim();
  }

  if (!partial || body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: "stock must be an integer >= 0" };
    }
    value.stock = stock;
  }

  if (body.rating !== undefined) {
    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return { error: "rating must be a number between 0 and 5" };
    }
    value.rating = Number(rating.toFixed(1));
  }

  if (body.image !== undefined) {
    if (body.image !== null && typeof body.image !== "string") {
      return { error: "image must be a URL string" };
    }
    value.image = body.image;
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      return { error: "description must be a string" };
    }
    value.description = body.description;
  }

  return { value };
}
