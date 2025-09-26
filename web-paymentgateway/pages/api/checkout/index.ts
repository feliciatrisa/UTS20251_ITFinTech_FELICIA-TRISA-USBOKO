import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Product from "../../../models/Product";
import Checkout from "../../../models/Checkout";

type CheckoutItem = { productId: string; qty: number };
type CheckoutBody = { items: CheckoutItem[]; email: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isCheckoutBody(v: unknown): v is CheckoutBody {
  if (!isRecord(v)) return false;
  const items = v.items;
  const email = v.email;
  if (!Array.isArray(items) || typeof email !== "string") return false;
  return items.every(
    (x) => isRecord(x) && typeof x.productId === "string" && typeof x.qty === "number" && x.qty > 0
  );
}

async function createXenditInvoice(externalId: string, amount: number, email: string) {
  const secret = process.env.XENDIT_SECRET_KEY;
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!secret || !base) {
    return { invoiceUrl: undefined, raw: { error: "missing_xendit_env" } };
  }
  const auth = Buffer.from(`${secret}:`).toString("base64");

  const resp = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      external_id: externalId,
      amount,
      payer_email: email,
      success_redirect_url: `${base}/payment/${externalId}`,
      failure_redirect_url: `${base}/payment/${externalId}?fail=1`,
      currency: "IDR",
    }),
  });

  const status = resp.status;
  const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  const invoiceUrl =
    (typeof json.invoice_url === "string" && json.invoice_url) ||
    (typeof json["invoice_url"] === "string" && (json["invoice_url"] as string)) ||
    undefined;

  return { invoiceUrl, status, raw: json };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();

  // Validasi body tanpa `any`
  const bodyUnknown = req.body as unknown;
  if (!isCheckoutBody(bodyUnknown)) {
    return res.status(400).json({ ok: false, error: "invalid_body" });
  }
  const { items, email } = bodyUnknown;

  // Ambil produk & hitung total
  const ids = items.map((it) => it.productId);
  const products = await Product.find({ _id: { $in: ids } }).lean();

  let amount = 0;
  for (const it of items) {
    const p = products.find((x) => String(x._id) === it.productId);
    if (!p) return res.status(400).json({ ok: false, error: "product_not_found", productId: it.productId });
    amount += (p.price as number) * it.qty;
  }
  if (amount <= 0) return res.status(400).json({ ok: false, error: "amount_zero" });

  // Simpan order lokal
  const order = await Checkout.create({
    email,
    items,
    amount,
    status: "PENDING",
  });

  const orderId = String(order._id);

  // Buat invoice Xendit (jika env tersedia)
  try {
    const { invoiceUrl, status, raw } = await createXenditInvoice(orderId, amount, email);
    if (!invoiceUrl) {
      return res.status(200).json({
        ok: true,
        orderId,
        invoiceUrl: null,
        xenditStatus: status,
        xendit: raw,
      });
    }
    return res.status(200).json({ ok: true, orderId, invoiceUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(200).json({
      ok: true,
      orderId,
      invoiceUrl: null,
      error: message,
    });
  }
}
