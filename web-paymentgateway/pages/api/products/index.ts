import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Product from "../../../models/Product";

// Daftar seed (boleh kamu edit harga/nama kapan pun)
const SEED: Array<{ name: string; price: number; category: string; image?: string }> = [
  // Drinks
  { name: "Americano",          price: 25000, category: "Drinks" },
  { name: "Latte",              price: 30000, category: "Drinks" },

  // Snacks
  { name: "Donut",              price: 15000, category: "Snacks" },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  if (req.method !== "GET") return res.status(405).end();

  // Pastikan semua item SEED ada (upsert, jadi aman dipanggil berkali-kali)
  await Product.bulkWrite(
    SEED.map((it) => ({
      updateOne: {
        filter: { name: it.name },
        update: { $setOnInsert: it },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  // Ambil semua produk (urut kategori lalu nama)
  const products = await Product.find().sort({ category: 1, name: 1 }).lean();
  res.json({ products });
}
