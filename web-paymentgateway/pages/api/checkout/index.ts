import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Product from "../../../models/Product";
import Checkout from "../../../models/Checkout";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const { items, email } = req.body as { items: { productId: string; qty: number }[]; email: string };

  // ambil produk & hitung total
  const ids = items.map(i => i.productId);
  const found = await Product.find({ _id: { $in: ids } }).lean();
  const filled = items.map(i => {
    const p = found.find(f => String(f._id) === i.productId)!;
    return { productId: p._id, name: p.name, price: p.price, qty: i.qty };
  });
  const total = filled.reduce((s, it) => s + it.price * it.qty, 0);

  const checkout = await Checkout.create({ email, items: filled, total, status: "PENDING" });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const secret = process.env.XENDIT_SECRET_KEY;

  // Log: pastikan key terbaca
  console.log(
    "XENDIT_SECRET_KEY?",
    secret ? `present (${secret.slice(0, 16)}…)` : "MISSING"
  );

  // Kalau tidak ada key -> dummy
  if (!secret || !secret.trim()) {
    const invoiceId = `DUMMY-${checkout._id}`;
    const invoiceUrl = `${baseUrl}/payment/${checkout._id}?dummy=1`;
    await Checkout.findByIdAndUpdate(checkout._id, { invoiceId, paymentLink: invoiceUrl });
    return res.json({ orderId: checkout._id, invoiceId, invoiceUrl });
  }

  // Buat invoice Xendit
  try {
    const resp = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(secret + ":").toString("base64"),
        "X-Idempotency-Key": checkout._id.toString(),
      },
      body: JSON.stringify({
        external_id: checkout._id.toString(),
        payer_email: email,
        amount: total,
        description: "UTS Payment",
        success_redirect_url: `${baseUrl}/payment/${checkout._id}`,
        failure_redirect_url: `${baseUrl}/payment/${checkout._id}`,
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Xendit create invoice failed:", resp.status, text);
      return res.status(500).json({ error: "xendit_failed", status: resp.status, body: text });
    }

    const inv = JSON.parse(text);
    await Checkout.findByIdAndUpdate(checkout._id, {
      invoiceId: inv.id,
      paymentLink: inv.invoice_url,
    });
    return res.json({ orderId: checkout._id, invoiceId: inv.id, invoiceUrl: inv.invoice_url });
  } catch (e: any) {
    console.error("Xendit fetch error:", e?.message || e);
    return res.status(500).json({ error: "xendit_exception", message: String(e?.message || e) });
  }
}
