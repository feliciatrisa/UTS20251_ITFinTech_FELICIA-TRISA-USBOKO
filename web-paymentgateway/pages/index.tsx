import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type Product = { _id:string; name:string; price:number; category:string };

export default function SelectItems() {
  const router = useRouter();
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

  function save(next: Record<string, number>) {
    setCart(next);
    localStorage.setItem("cart", JSON.stringify(next));
  }

  function inc(id: string) {
    const next = { ...cart, [id]: (cart[id] || 0) + 1 };
    save(next);
  }

  function dec(id: string) {
    const cur = cart[id] || 0;
    if (cur <= 1) {
      const { [id]: _, ...rest } = cart; // hapus item kalau jadi 0
      save(rest);
    } else {
      save({ ...cart, [id]: cur - 1 });
    }
  }

  const totalItems = Object.values(cart).reduce((s, n) => s + n, 0);

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Select Items</h1>

      {/* Filter kategori */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd",
              background: c === filter ? "#eee" : "white", cursor: "pointer"
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* List produk */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {visible.map(p => {
          const qty = cart[p._id] || 0;
          return (
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

              {/* controls - / + */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120, justifyContent: "flex-end" }}>
                <button onClick={() => dec(p._id)}
                        disabled={qty === 0}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ddd",
                                 cursor: qty=== 0 ? "not-allowed" : "pointer", background: "white" }}>–</button>
                <div style={{ minWidth: 24, textAlign: "center" }}>{qty}</div>
                <button onClick={() => inc(p._id)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ddd",
                                 cursor: "pointer", background: "white" }}>+</button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <div>Total items: <b>{totalItems}</b></div>
        <button
          onClick={() => router.push("/checkout")}
          disabled={totalItems === 0}
          style={{
            padding: "8px 14px", borderRadius: 8, border: "none",
            background: "black", color: "white", cursor: totalItems===0 ? "not-allowed" : "pointer",
            opacity: totalItems===0 ? 0.6 : 1
          }}
          title={totalItems === 0 ? "Tambahkan item dulu" : "Lanjut ke Checkout"}
        >
          Go to Checkout →
        </button>
      </div>
    </div>
  );
}
