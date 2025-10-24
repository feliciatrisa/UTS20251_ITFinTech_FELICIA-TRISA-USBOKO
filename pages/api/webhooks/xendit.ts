import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Checkout from "../../../models/Checkout";
import Payment from "../../../models/Payment";
import User from "../../../models/User";
import { whatsappService } from "../../../lib/whatsapp";

export const config = { api: { bodyParser: true } };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function pickStr(o: Record<string, unknown>, k: string): string | undefined {
  const v = o[k]; return typeof v === "string" ? v : undefined;
}
function pickNum(o: Record<string, unknown>, k: string): number | undefined {
  const v = o[k]; return typeof v === "number" ? v : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  // verifikasi token callback
  const expected = process.env.XENDIT_CALLBACK_TOKEN;
  const hdr = req.headers["x-callback-token"];
  const token = Array.isArray(hdr) ? hdr[0] : hdr;
  if (!expected || token !== expected) return res.status(401).json({ ok: false, error: "invalid_token" });

  if (!isObj(req.body)) return res.status(400).json({ ok: false, error: "invalid_body" });
  const root = req.body;
  const data = isObj(root.data) ? root.data : undefined;

  // normalisasi status & field
  const status = pickStr(root, "status") ?? pickStr(root, "event") ?? (data && pickStr(data, "status"));
  const isPaid = status === "PAID" || status === "invoice.paid";

  try {
    if (isPaid) {
      const invoiceId = pickStr(root, "id") ?? (data && pickStr(data, "id"));
      const externalId = pickStr(root, "external_id") ?? (data && pickStr(data, "external_id"));
      const amount = pickNum(root, "amount") ?? (data && pickNum(data, "amount"));

      const where = externalId ? { _id: externalId } : invoiceId ? { invoiceId } : null;
      let updatedCheckout = null;
      if (where) {
        updatedCheckout = await Checkout.findOneAndUpdate(where, { status: "LUNAS" }, { new: true }).populate('userId');
      }

      await Payment.create({
        invoiceId: invoiceId ?? "(unknown)",
        amount,
        status: "PAID",
        paidAt: new Date(),
        raw: root
      });

      // Send WhatsApp payment confirmation
      if (updatedCheckout && updatedCheckout.userId) {
        try {
          const user = await User.findById(updatedCheckout.userId);
          if (user && user.phone) {
            await whatsappService.sendPaymentConfirmation(
              user.phone, 
              String(updatedCheckout._id), 
              amount || updatedCheckout.total
            );
          }
        } catch (whatsappError) {
          console.error('Failed to send WhatsApp payment confirmation:', whatsappError);
          // Continue with the process even if WhatsApp fails
        }
      }
    }
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false });
  }
}
