import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Checkout from "../../../models/Checkout";
import Payment from "../../../models/Payment";

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const token = req.headers["x-callback-token"];
  if (!token || token !== process.env.XENDIT_CALLBACK_TOKEN) {
    return res.status(401).json({ ok: false });
  }

  const event = req.body as any;
  try {
    if (event?.status === "PAID" || event?.event === "invoice.paid") {
      const invoiceId = event?.id || event?.data?.id;
      const externalId = event?.external_id || event?.data?.external_id;
      const amount = event?.amount || event?.data?.amount;

      const where = externalId ? { _id: externalId } : { invoiceId };
      await Checkout.findOneAndUpdate(where, { status: "LUNAS" });

      await Payment.create({
        invoiceId: invoiceId ?? "(unknown)",
        amount,
        status: "PAID",
        paidAt: new Date(),
        raw: event,
      });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
}
