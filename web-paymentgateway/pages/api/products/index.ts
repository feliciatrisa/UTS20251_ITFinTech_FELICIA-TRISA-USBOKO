import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Product from "../../../models/Product";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  if (req.method !== "GET") return res.status(405).end();

  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      { name: "Americano", price: 25000, category: "Drinks" },
      { name: "Latte",     price: 30000, category: "Drinks" },
      { name: "Donut",     price: 15000, category: "Snacks" },
    ]);
  }

  const products = await Product.find().lean();
  res.json({ products });
}
