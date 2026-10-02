import { useEffect, useMemo, useState } from "react";

const money = (n) => `$${Number(n).toFixed(2)}`;
const EMPTY = {
  name: "",
  category: "",
  price: "",
  stock: "",
  rating: "",
  image: "",
  description: ""
};

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => sessionStorage.getItem("adminAuthToken") === "true"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");

  const [filter, setFilter] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === "admin@gmail.com" && password === "Nepal@123") {
      setIsLoggedIn(true);
      sessionStorage.setItem("adminAuthToken", "true");
      setLoginError("");
    } else {
      setLoginError("Invalid email or password");
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, oRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/orders")
      ]);
      if (!pRes.ok) throw new Error(`API error ${pRes.status}`);
      setProducts(await pRes.json());
      setCategories(await cRes.json());
      setOrders(await oRes.json());
      setFetchError("");
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name ?? "",
      category: product.category ?? "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
      rating: String(product.rating ?? ""),
      image: product.image ?? "",
      description: product.description ?? ""
    });
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: Number(form.price),
        stock: Number(form.stock),
        rating: form.rating === "" ? 0 : Number(form.rating),
        image: form.image,
        description: form.description
      };

      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      setFlash(editingId ? `Updated “${data.name}”` : `Created “${data.name}” (#${data.id})`);
      cancelEdit();
      await loadAll();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete “${product.name}” (#${product.id})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Delete failed (${res.status})`);
      setFlash(`Deleted “${data.removed.name}”`);
      if (editingId === product.id) cancelEdit();
      await loadAll();
    } catch (err) {
      setFlash(`⚠️ ${err.message}`);
    }
  };

  const visible = useMemo(() => {
    if (!filter.trim()) return products;
    const q = filter.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, filter]);

  if (!isLoggedIn) {
    return (
      <div className="admin">
        <section className="admin-form-card" style={{ maxWidth: "400px", margin: "40px auto" }}>
          <div className="admin-form-head">
            <h2>Admin Login</h2>
          </div>
          {loginError && <div className="state error">{loginError}</div>}
          <form className="product-form" onSubmit={handleLogin}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@gmail.com" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </label>
            <div className="form-actions wide">
              <button type="submit" className="primary">Login</button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="admin">
      <section className="admin-form-card">
        <div className="admin-form-head">
          <h2>{editingId ? `Edit product #${editingId}` : "Add a new product"}</h2>
          <div>
            {editingId ? (
              <button className="link-btn" onClick={cancelEdit}>
                ← Cancel editing
              </button>
            ) : (
              <button className="link-btn" onClick={() => { setIsLoggedIn(false); sessionStorage.removeItem("adminAuthToken"); }}>
                Logout
              </button>
            )}
          </div>
        </div>

        {flash && <div className="banner success">{flash}</div>}
        {formError && <div className="state error">{formError}</div>}

        <form className="product-form" onSubmit={submit}>
          <label>
            Name *
            <input value={form.name} onChange={setField("name")} placeholder="e.g. Aurora Headphones" required />
          </label>

          <label>
            Category *
            <input
              list="category-list"
              value={form.category}
              onChange={setField("category")}
              placeholder="e.g. Electronics"
              required
            />
            <datalist id="category-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label>
            Price ($) *
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={setField("price")}
              placeholder="29.99"
              required
            />
          </label>

          <label>
            Stock *
            <input
              type="number"
              step="1"
              min="0"
              value={form.stock}
              onChange={setField("stock")}
              placeholder="10"
              required
            />
          </label>

          <label>
            Rating (0–5)
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={setField("rating")}
              placeholder="4.5"
            />
          </label>

          <label className="wide">
            Image URL
            <input
              type="url"
              value={form.image}
              onChange={setField("image")}
              placeholder="https://…/photo.jpg"
            />
          </label>

          <label className="wide">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={setField("description")}
              placeholder="Short product description…"
            />
          </label>

          <div className="form-actions wide">
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create product"}
            </button>
            {editingId && (
              <button type="button" className="ghost" onClick={cancelEdit}>
                Discard
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-table-card">
        <div className="table-head">
          <h2>
            Products <span className="count">({visible.length})</span>
          </h2>
          <input
            className="search narrow"
            type="search"
            placeholder="Filter by name or category…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {loading && <div className="state">Loading…</div>}
        {fetchError && <div className="state error">Could not reach the API: {fetchError}</div>}

        {!loading && !fetchError && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className={editingId === p.id ? "row-editing" : ""}>
                    <td>#{p.id}</td>
                    <td>
                      <img className="row-thumb" src={p.image} alt="" />
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.category}</td>
                    <td>{money(p.price)}</td>
                    <td className={p.stock <= 5 ? "low" : ""}>{p.stock}</td>
                    <td>★ {(p.rating ?? 0).toFixed(1)}</td>
                    <td className="row-actions">
                      <button className="small" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button className="small danger" onClick={() => remove(p)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="state">No products found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-table-card">
        <h2>
          Orders <span className="count">({orders.length})</span>
        </h2>
        {orders.length === 0 ? (
          <div className="state">No orders yet — checkout from the storefront to create one.</div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {[...orders].reverse().map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{new Date(o.createdAt).toLocaleString()}</td>
                    <td>
                      {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </td>
                    <td>{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

