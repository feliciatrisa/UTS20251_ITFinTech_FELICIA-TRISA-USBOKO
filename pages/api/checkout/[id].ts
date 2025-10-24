import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Checkout from "../../../models/Checkout";

// tipe data checkout saat di-lean
type CheckoutLean = {
  _id: string;
  email?: string;
  items: { productId: string; name: string; price: number; qty: number }[];
  total: number;
  status: "PENDING" | "LUNAS";
  invoiceId?: string;
  paymentLink?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // pastikan id = string
  const q = req.query as { id?: string | string[] };
  const id = Array.isArray(q.id) ? q.id[0] : q.id;
  if (!id) return res.status(400).json({ error: "missing id" });

  // beri tipe hasil lean supaya TS tahu ada 'status'
  const data = await Checkout.findById(id).lean<CheckoutLean>();
  if (!data) return res.status(404).json({ error: "Not found" });

  return res.json({ status: data.status, data });
}
