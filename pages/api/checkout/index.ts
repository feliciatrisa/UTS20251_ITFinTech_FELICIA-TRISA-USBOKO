import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Product from "../../../models/Product";
import Checkout from "../../../models/Checkout";
import User from "../../../models/User";
import { withAuth, AuthenticatedRequest } from "../../../lib/auth";
import { whatsappService } from "../../../lib/whatsapp";

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

async function handler(req: AuthenticatedRequest, res: NextApiResponse): Promise<void> {
  await dbConnect();

  if (req.method === "GET") {
    // Fetch orders - all orders for admin, user-specific orders for regular users
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId) {
        res.status(401).json({ ok: false, error: 'User not authenticated' });
        return;
      }

      let orders;
      if (userRole === 'admin') {
        // Admin can see all orders
        orders = await Checkout.find({})
          .populate('items.productId', 'name price')
          .populate('userId', 'phone')
          .sort({ createdAt: -1 })
          .lean();
      } else {
        // Regular users can only see their own orders
        orders = await Checkout.find({ userId })
          .populate('items.productId', 'name price')
          .sort({ createdAt: -1 })
          .lean();
      }
      
      res.status(200).json({ ok: true, orders });
      return;
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch orders' });
      return;
    }
  }

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  // Get authenticated user
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ ok: false, error: 'User not authenticated' });
    return;
  }

  // Validasi body tanpa `any`
  const bodyUnknown = req.body as unknown;
  if (!isCheckoutBody(bodyUnknown)) {
    res.status(400).json({ ok: false, error: "invalid_body" });
    return;
  }
  const { items, email } = bodyUnknown;

  // Ambil produk & hitung total
  const ids = items.map((it) => it.productId);
  const products = await Product.find({ _id: { $in: ids } }).lean();

  let amount = 0;
  for (const it of items) {
    const p = products.find((x) => String(x._id) === it.productId);
    if (!p) {
      res.status(400).json({ ok: false, error: "product_not_found", productId: it.productId });
      return;
    }
    amount += (p.price as number) * it.qty;
  }
  if (amount <= 0) {
    res.status(400).json({ ok: false, error: "amount_zero" });
    return;
  }

  // Simpan order lokal
  const order = await Checkout.create({
    userId,
    email,
    items,
    total: amount,
    status: "PENDING",
  });

  const orderId = String(order._id);

  // Send WhatsApp notification for checkout
  try {
    const user = await User.findById(userId);
    if (user && user.phone) {
      // Prepare items for WhatsApp message
      const itemsForMessage = items.map(item => {
        const product = products.find(p => String(p._id) === item.productId);
        return {
          name: product?.name || 'Unknown Product',
          qty: item.qty,
          price: product?.price || 0
        };
      });

      await whatsappService.sendCheckoutNotification(user.phone, itemsForMessage, amount);
    }
  } catch (whatsappError) {
    console.error('Failed to send WhatsApp checkout notification:', whatsappError);
    // Continue with the process even if WhatsApp fails
  }

  // Buat invoice Xendit (jika env tersedia)
  try {
    const { invoiceUrl, status, raw } = await createXenditInvoice(orderId, amount, email);
    if (!invoiceUrl) {
      res.status(200).json({
        ok: true,
        orderId,
        invoiceUrl: null,
        xenditStatus: status,
        xendit: raw,
      });
      return;
    }
    res.status(200).json({ ok: true, orderId, invoiceUrl });
    return;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(200).json({
      ok: true,
      orderId,
      invoiceUrl: null,
      error: message,
    });
    return;
  }
}

export default withAuth(handler);
