import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PaymentStatus() {
  const { query } = useRouter();
  const [status, setStatus] = useState<string>("MENUNGGU");
  const [paymentLink, setPaymentLink] = useState<string>("");

  useEffect(() => {
    if (!query.id) return;
    const url = `/api/checkout/${query.id}`;
    const tick = async () => {
      try {
        const r = await fetch(url);
        const d = await r.json();
        if (d?.status) setStatus(d.status);
        if (d?.data?.paymentLink) setPaymentLink(d.data.paymentLink);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [query.id]);

  const isLunas = status === "LUNAS";

  return (
    <div style={{maxWidth: 700, margin:"24px auto", padding:16}}>
      <h1>Payment Status</h1>
      <p>Order: <b>{String(query.id || "")}</b></p>
      <p>Status: <b>{isLunas ? "LUNAS" : "MENUNGGU PEMBAYARAN"}</b></p>

      {!isLunas && paymentLink && (
        <a href={paymentLink} target="_blank" rel="noreferrer"
           style={{display:"inline-block", marginTop:8, padding:"8px 14px",
                   background:"black", color:"white", borderRadius:8, textDecoration:"none"}}>
          Buka Invoice
        </a>
      )}
    </div>
  );
}
