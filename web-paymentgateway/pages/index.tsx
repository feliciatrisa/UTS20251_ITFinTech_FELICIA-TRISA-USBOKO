import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = { _id:string; name:string; price:number; category:string };

export default function SelectItems() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(d => setProducts(d.products || []));
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map(p => p.category)))],
    [products]
  );

  const visible = useMemo(
    () => products.filter(p => filter === "All" || p.category === filter),
    [products, filter]
  );

  function add(id: string) {
    const next = { ...cart, [id]: (cart[id] || 0) + 1 };
    setCart(next);
    localStorage.setItem("cart", JSON.stringify(next));
  }

  const totalItems = Object.values(cart).reduce((s, n) => s + n, 0);

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Select Items</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd",
                     background: c === filter ? "#eee" : "white", cursor: "pointer" }}>
            {c}
          </button>
        ))}
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {visible.map(p => (
          <li key={p._id}
              style={{ display: "flex", alignItems: "center", gap: 12,
                       padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <small style={{ color: "#666" }}>{p.category}</small>
            </div>
            <div style={{ width: 160, textAlign: "right" }}>
              Rp{p.price.toLocaleString("id-ID")}
            </div>
            <button onClick={() => add(p._id)}
                    style={{ marginLeft: 12, padding: "6px 10px", borderRadius: 8,
                             border: "1px solid #ddd", cursor: "pointer" }}>
              Add
            </button>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <div>Total items: <b>{totalItems}</b></div>
        <Link href="/checkout" style={{ textDecoration: "none" }}>
          <button style={{ padding: "8px 14px", borderRadius: 8, border: "none",
                           background: "black", color: "white", cursor: "pointer" }}>
            Go to Checkout →
          </button>
        </Link>
      </div>
    </div>
  );
}
