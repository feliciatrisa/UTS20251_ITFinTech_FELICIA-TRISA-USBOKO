import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type Product = { _id: string; name: string; price: number; category: string; image?: string };

// mapping nama -> url gambar (fallback ke p.image kalau nanti kamu simpan di DB)
const IMAGE_MAP: Record<string, string> = {
  "Americano":
    "https://www.nescafe.com/id/sites/default/files/2023-08/Kopi-Hitam-Americano-dan-Espresso%2C-Apa-Bedanya%2C-Ya_hero.jpg",
  "Latte": "https://richcreme.com/wp-content/uploads/2022/07/latte.jpg",
  "Donut":
    "https://asset.kompas.com/crops/8DNn_TysDAvoJh8llTBWsDiY0QM=/0x0:1000x667/1200x800/data/photo/2020/07/11/5f099b4239eb1.jpg",
};

export default function SelectItems() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [user, setUser] = useState<{ phone: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get user-specific cart key
  const getCartKey = (userPhone: string) => `cart_${userPhone}`;

  // Helper function to load user-specific cart
  const loadUserCart = (userPhone: string) => {
    const cartKey = getCartKey(userPhone);
    const saved = localStorage.getItem(cartKey);
    if (saved) {
      try {
        const parsedCart = JSON.parse(saved);
        if (typeof parsedCart === 'object' && parsedCart !== null) {
          setCart(parsedCart);
        } else {
          localStorage.removeItem(cartKey);
          setCart({});
        }
      } catch (error) {
        console.error('Invalid cart data:', error);
        localStorage.removeItem(cartKey);
        setCart({});
      }
    } else {
      setCart({});
    }
  };

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            // Load user-specific cart
            loadUserCart(userData.phone);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Don't clear user-specific carts, just reset current cart
            setCart({});
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setCart({});
        }
      } else {
        // No user logged in, reset cart
        setCart({});
      }
      setIsLoading(false);
    };

    // Fetch products
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
    
    // Check auth and load appropriate cart
    checkAuth();
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  function save(next: Record<string, number>) {
    setCart(next);
    // Save to user-specific cart if user is logged in
    if (user) {
      const cartKey = getCartKey(user.phone);
      localStorage.setItem(cartKey, JSON.stringify(next));
    }
  }

  function requireAuth(action: () => void) {
    if (!user) {
      router.push('/login');
      return;
    }
    action();
  }

  function inc(id: string) {
    requireAuth(() => {
      save({ ...cart, [id]: (cart[id] || 0) + 1 });
    });
  }

  function dec(id: string) {
    requireAuth(() => {
      const cur = cart[id] || 0;
      if (cur <= 1) {
        const n = { ...cart }; // ← hindari var unused
        delete n[id];
        save(n);
      } else {
        save({ ...cart, [id]: cur - 1 });
      }
    });
  }

  const handleLogout = () => {
    // Save current cart to user-specific storage before logout
    if (user && Object.keys(cart).length > 0) {
      const cartKey = getCartKey(user.phone);
      localStorage.setItem(cartKey, JSON.stringify(cart));
    }
    
    // Clear auth data but keep user-specific carts
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset current state
    setUser(null);
    setCart({});
    router.push('/');
  };

  const handleCheckout = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (totalItems === 0) {
      return;
    }
    router.push('/checkout');
  };

  const filtered = useMemo(() => {
    const byCat = products.filter((p) => filter === "All" || p.category === filter);
    if (!q.trim()) return byCat;
    const k = q.toLowerCase();
    return byCat.filter(
      (p) => p.name.toLowerCase().includes(k) || p.category.toLowerCase().includes(k)
    );
  }, [products, filter, q]);

  const totalItems = Object.values(cart).reduce((s, n) => s + n, 0);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-xl font-semibold">O&apos; Yum Cafe</div>
        
        {/* Auth section */}
        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-300">
                {user.phone} {user.role === 'admin' && '(Admin)'}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl text-sm border border-white/15 bg-white/10 hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => router.push("/login")}
                className="px-3 py-1.5 rounded-xl text-sm border border-white/15 bg-white/10 hover:bg-white/20"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/register")}
                className="px-3 py-1.5 rounded-xl text-sm bg-indigo-500 hover:bg-indigo-400"
              >
                Register
              </button>
            </>
          )}
        </div>

        {/* search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex-1 max-w-md">
          <span>🔎</span>
          <input
            placeholder="Search menu…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-transparent outline-none flex-1"
          />
        </div>

        {/* cart */}
        <button className="relative w-10 h-10 rounded-xl bg-white/5 grid place-items-center">
          🛒
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-500">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => {
          const active = c === filter;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-sm border transition
                ${active ? "bg-white border-white/20 text-black" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* product grid (landscape) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => {
          const qty = cart[p._id] || 0;
          const img = IMAGE_MAP[p.name] || p.image || "/file.svg";
          return (
            <div key={p._id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <img src={img} alt={p.name} className="w-full h-40 object-cover bg-white/10" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-neutral-400">{p.category}</div>
                  </div>
                  <div className="font-semibold whitespace-nowrap">
                    Rp{p.price.toLocaleString("id-ID")}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  {qty === 0 ? (
                    <button
                      onClick={() => inc(p._id)}
                      className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-sm"
                    >
                      Add  +
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => dec(p._id)}
                        className="w-8 h-8 rounded-lg border border-white/15 hover:bg-white/10"
                      >
                        −
                      </button>
                      <div className="w-7 text-center">{qty}</div>
                      <button
                        onClick={() => inc(p._id)}
                        className="w-8 h-8 rounded-lg border border-white/15 hover:bg-white/10"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* footer */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          Total items: <b>{totalItems}</b>
        </div>
        <button
          onClick={handleCheckout}
          disabled={totalItems === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 font-medium hover:bg-indigo-400
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Checkout →
        </button>
      </div>
    </div>
  );
}
