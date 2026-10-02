import { useEffect, useState } from "react";
import Shop from "./Shop.jsx";
import Admin from "./Admin.jsx";

function navigate(to) {
  if (to === window.location.pathname) return;
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

function Link({ to, className, children }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand">
          <span className="logo">🛍️</span>
          <div>
            <h1>ShopReact</h1>
            <p className="tagline">Node.js API + React storefront</p>
          </div>
        </Link>
        <nav className="nav">
          <Link to="/" className={`nav-link ${path === "/" ? "active" : ""}`}>
            Storefront
          </Link>
          <Link to="/admin" className={`nav-link ${path === "/admin" ? "active" : ""}`}>
            Admin / CRUD
          </Link>
        </nav>
      </header>

      {path === "/" ? <Shop /> : path === "/admin" ? <Admin /> : <NotFound path={path} />}

      <footer className="footer">
        Backend: <code>http://localhost:5000/api/products</code> · Frontend:{" "}
        <code>http://localhost:5173</code> · Admin: <code>/admin</code>
      </footer>
    </div>
  );
}

function NotFound({ path }) {
  return (
    <main>
      <div className="state error">
        404 — no page at <code>{path}</code>.{" "}
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
          Go to the storefront
        </a>
      </div>
    </main>
  );
}
