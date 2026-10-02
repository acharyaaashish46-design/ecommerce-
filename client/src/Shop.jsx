import { useEffect, useMemo, useState } from "react";

const money = (n) => `$${n.toFixed(2)}`;

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("");

  const [cart, setCart] = useState([]); // { id, name, price, quantity }
  const [cartOpen, setCartOpen] = useState(false);
  const [order, setOrder] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Fetch categories once
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Fetch products whenever filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "All") params.set("category", category);
    if (sort) params.set("sort", sort);

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setProducts(data);
        setError("");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [search, category, sort]);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addToCart = (product) => {
    setOrder(null);
    setCartOpen(true);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const placeOrder = async () => {
    setPlacing(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map(({ id, quantity }) => ({ id, quantity })) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      setOrder(data);
      setCart([]);
      setCartOpen(false);
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  const featured = useMemo(() => products.slice(0, 3), [products]);

  return (
    <div className="shop">
      {order && (
        <div className="banner success">
          ✅ Order #{order.id} placed! Total {money(order.total)} — thank you!
        </div>
      )}

      <button className="cart-fab" onClick={() => setCartOpen(true)}>
        🛒 Cart {cartCount > 0 && <span className="badge">{cartCount}</span>}
        {cartCount > 0 && <span className="fab-total">{money(cartTotal)}</span>}
      </button>

      <section className="controls">
        <input
          className="search"
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="chips">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? "active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">Default order</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="rating">Top rated</option>
          <option value="name">Name A–Z</option>
        </select>
      </section>

      <main>
        {loading && <div className="state">Loading products…</div>}
        {error && (
          <div className="state error">
            Could not reach the API: {error}. Is the server running on port 5000?
          </div>
        )}

        {!loading && !error && (
          <>
            {search === "" && category === "All" && featured.length > 0 && (
              <section className="featured">
                <h2>Featured</h2>
                <div className="grid featured-grid">
                  {featured.map((p) => (
                    <ProductCard key={`f-${p.id}`} product={p} onAdd={addToCart} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2>
                {category === "All" ? "All products" : category}{" "}
                <span className="count">({products.length})</span>
              </h2>
              {products.length === 0 ? (
                <div className="state">No products match your filters.</div>
              ) : (
                <div className="grid">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={addToCart} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h2>Your cart</h2>
              <button className="close" onClick={() => setCartOpen(false)}>
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="state">Your cart is empty.</p>
            ) : (
              <ul className="cart-list">
                {cart.map((item) => (
                  <li key={item.id}>
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <span>{money(item.price)} each</span>
                    </div>
                    <div className="qty">
                      <button onClick={() => changeQty(item.id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQty(item.id, 1)}>+</button>
                    </div>
                    <span className="line-total">{money(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}

            {checkoutError && <div className="state error">{checkoutError}</div>}

            <div className="drawer-foot">
              <div className="total">
                <span>Total</span>
                <strong>{money(cartTotal)}</strong>
              </div>
              <button
                className="checkout"
                disabled={cart.length === 0 || placing}
                onClick={placeOrder}
              >
                {placing ? "Placing order…" : "Checkout"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd }) {
  const out = product.stock <= 0;
  return (
    <article className="card">
      <div className="thumb">
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="cat">{product.category}</span>
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>
        <p className="desc">{product.description}</p>
        <div className="meta">
          <span className="rating">★ {(product.rating ?? 0).toFixed(1)}</span>
          <span className={product.stock <= 5 ? "low" : "stock"}>
            {out ? "Out of stock" : `${product.stock} left`}
          </span>
        </div>
        <div className="card-foot">
          <span className="price">{money(product.price)}</span>
          <button disabled={out} onClick={() => onAdd(product)}>
            {out ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
