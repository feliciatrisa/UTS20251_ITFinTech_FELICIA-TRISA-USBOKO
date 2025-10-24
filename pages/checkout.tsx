import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type Product = { _id: string; name: string; price: number; category: string; image?: string };
type Row = { _id: string; name: string; price: number; qty: number; subtotal: number };
type User = { userId: string; phone: string; role: string };

// gambar default per nama produk
const IMAGE_MAP: Record<string, string> = {
  "Americano":
    "https://www.nescafe.com/id/sites/default/files/2023-08/Kopi-Hitam-Americano-dan-Espresso%2C-Apa-Bedanya%2C-Ya_hero.jpg",
  "Latte": "https://richcreme.com/wp-content/uploads/2022/07/latte.jpg",
  "Donut": "https://asset.kompas.com/crops/8DNn_TysDAvoJh8llTBWsDiY0QM=/0x0:1000x667/1200x800/data/photo/2020/07/11/5f099b4239eb1.jpg",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

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

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?redirect=/checkout');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          localStorage.removeItem('token');
          router.push('/login?redirect=/checkout');
          return;
        }

        const userData = await response.json();
        setUser(userData.user);
        setEmail(userData.user.phone + '@example.com'); // Set default email based on phone
        
        // Load user-specific cart after authentication
        loadUserCart(userData.user.phone);
        
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        router.push('/login?redirect=/checkout');
      }
    };

    checkAuth();
  }, [router]);

  // load products
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/products");
        const d = await r.json();
        setProducts(d.products || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // baris keranjang
  const rows: Row[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = products.find((x) => x._id === id);
        return p ? { _id: p._id, name: p.name, price: p.price, qty, subtotal: p.price * qty } : null;
      })
      .filter(Boolean) as Row[];
  }, [products, cart]);

  // angka-angka
  const itemsPrice = rows.reduce((s, r) => s + r.subtotal, 0);
  const tax = Math.round(itemsPrice * 0.1); // contoh 10%
  const total = itemsPrice + tax;

  // helper qty
  function inc(id: string) {
    if (!user) return;
    
    setCart((c) => {
      const n = { ...c, [id]: (c[id] || 0) + 1 };
      const cartKey = getCartKey(user.phone);
      localStorage.setItem(cartKey, JSON.stringify(n));
      return n;
    });
  }
  function dec(id: string) {
    if (!user) return;
    
    setCart((c) => {
      const cur = c[id] || 0;
      let n: Record<string, number>;
      if (cur <= 1) {
        n = { ...c };
        delete n[id]; // ← hapus properti tanpa bikin var unused
      } else {
        n = { ...c, [id]: cur - 1 };
      }
      const cartKey = getCartKey(user.phone);
      localStorage.setItem(cartKey, JSON.stringify(n));
      return n;
    });
  }

  const canPay = rows.length > 0 && total > 0 && /\S+@\S+\.\S+/.test(email) && !isPaymentProcessing;

  // hubungkan ke Xendit
  async function pay() {
    if (!user) {
      alert('Anda harus login terlebih dahulu');
      return;
    }

    if (isPaymentProcessing) {
      return; // Prevent multiple clicks
    }

    setIsPaymentProcessing(true);

    const items = rows.map((r) => ({ productId: r._id, qty: r.qty }));
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ items, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(
          `Xendit error ${data.status || ""}\n` +
            (data.body || data.message || JSON.stringify(data)).slice(0, 500)
        );
        setIsPaymentProcessing(false);
        return;
      }

      // Clear cart after successful payment processing
      if (user) {
        const cartKey = getCartKey(user.phone);
        localStorage.removeItem(cartKey);
        setCart({});
      }

      if (data?.invoiceUrl) {
        window.location.href = data.invoiceUrl;
        return;
      }
      window.location.href = `/payment/${data.orderId}`;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(`Network/Unexpected error: ${message}`);
      setIsPaymentProcessing(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-neutral-300">Memverifikasi akses...</p>
          </div>
        </div>
      ) : !user ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-neutral-300 mb-4">Anda harus login untuk mengakses checkout</p>
            <button 
              onClick={() => router.push('/login?redirect=/checkout')}
              className="px-6 py-2 bg-neutral-200 text-black rounded-xl hover:bg-white"
            >
              Login
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* top bar */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.push("/")} className="text-sm text-neutral-300 hover:text-white">
              ← Back
            </button>
            <h1 className="text-2xl font-semibold">Checkout - {user.phone}</h1>
            <div className="w-24" />
          </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* kiri: list item */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 divide-y divide-white/10">
            {rows.map((r) => {
              const prod = products.find((x) => x._id === r._id);
              const img = prod?.image || IMAGE_MAP[r.name] || "/file.svg";
              return (
                <div key={r._id} className="p-4 flex items-center gap-4">
                  <img
                    src={img}
                    alt={r.name}
                    className="w-14 h-14 rounded-lg object-cover bg-white/10 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{r.name}</div>
                    {/* kontrol qty: − 2 + */}
                    <div className="mt-2 inline-flex items-center rounded-lg overflow-hidden border border-white/15">
                      <button
                        onClick={() => dec(r._id)}
                        className="px-3 py-1.5 hover:bg-white/10"
                        aria-label="decrease"
                      >
                        −
                      </button>
                      <div className="px-3 py-1.5 border-l border-r border-white/10 min-w-[2.5rem] text-center">
                        {r.qty}
                      </div>
                      <button
                        onClick={() => inc(r._id)}
                        className="px-3 py-1.5 hover:bg-white/10"
                        aria-label="increase"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {/* harga di kanan */}
                  <div className="w-28 text-right font-semibold">
                    Rp{r.subtotal.toLocaleString("id-ID")}
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="p-8 text-center text-neutral-400">
                Keranjang kosong. Kembali ke menu untuk menambah item.
              </div>
            )}
          </div>
        </div>

        {/* kanan: ringkasan & pembayaran */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            {/* subtotal / tax / total */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp{itemsPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (10%)</span>
                <span>Rp{tax.toLocaleString("id-ID")}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-white/10 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>Rp{total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* email + confirm & pay (Xendit) */}
            <div className="mt-5">
              <label className="text-sm text-neutral-300">Email</label>
              <input
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none"
              />
              <button
                onClick={pay}
                disabled={!canPay}
                className="mt-3 w-full rounded-xl bg-neutral-200 text-black py-3 font-semibold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title={!canPay ? "Isi email yang valid & pastikan ada item" : "Bayar dengan Xendit"}
              >
                {isPaymentProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Confirm & Pay"
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>
      </>
      )}
    </div>
  );
}
