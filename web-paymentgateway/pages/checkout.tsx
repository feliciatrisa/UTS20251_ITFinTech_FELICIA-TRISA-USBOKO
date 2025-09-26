import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type Row = { _id:string; name:string; price:number; qty:number; subtotal:number };

export default function CheckoutPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(d => setProducts(d.products || []));
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const rows: Row[] = useMemo(() => {
    return Object.entries(cart).map(([id, qty]) => {
      const p = products.find((x:any) => x._id === id);
      return p ? { _id:p._id, name:p.name, price:p.price, qty, subtotal: p.price*qty } : null;
    }).filter(Boolean) as Row[];
  }, [products, cart]);

  const total = rows.reduce((s,r)=>s+r.subtotal,0);

  async function pay() {
    const items = rows.map(r => ({ productId: r._id, qty: r.qty }));
    const res = await fetch("/api/checkout", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ items, email }),
    });
    const data = await res.json();
    if (data?.invoiceUrl) window.location.href = data.invoiceUrl; // Xendit / dummy link
    else router.push(`/payment/${data.orderId}`);
  }

  return (
    <div style={{maxWidth: 900, margin:"24px auto", padding:16}}>
      <h1>Checkout</h1>

      <table width="100%" cellPadding={8} style={{borderCollapse:"collapse"}}>
        <thead>
          <tr><th align="left">Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r._id} style={{borderBottom:"1px solid #eee"}}>
              <td>{r.name}</td>
              <td align="center">{r.qty}</td>
              <td align="right">Rp{r.price.toLocaleString("id-ID")}</td>
              <td align="right">Rp{r.subtotal.toLocaleString("id-ID")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{textAlign:"right"}}>Total: Rp{total.toLocaleString("id-ID")}</h3>

      <div style={{display:"flex", gap:8, justifyContent:"flex-end", alignItems:"center"}}>
        <input placeholder="Email untuk invoice" value={email}
               onChange={e=>setEmail(e.target.value)}
               style={{padding:8, border:"1px solid #ddd", borderRadius:8, minWidth:260}}/>
        <button onClick={pay}
                style={{padding:"8px 14px", borderRadius:8, border:"none", background:"black", color:"white", cursor:"pointer"}}>
          Confirm & Pay
        </button>
      </div>
    </div>
  );
}
