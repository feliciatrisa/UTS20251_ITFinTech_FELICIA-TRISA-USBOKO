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

  switch (req.method) {
    case "GET":
      return handleGet(req, res);
    case "POST":
      return handlePost(req, res);
    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
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
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, price, category, image } = req.body;

    // Validasi input
    if (!name || !price || !category) {
      return res.status(400).json({ error: "Name, price, and category are required" });
    }

    if (typeof price !== "number" || price <= 0) {
      return res.status(400).json({ error: "Price must be a positive number" });
    }

    // Cek apakah produk dengan nama yang sama sudah ada
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({ error: "Product with this name already exists" });
    }

    // Buat produk baru
    const product = new Product({
      name,
      price,
      category,
      image: image || undefined,
    });

    await product.save();
    res.status(201).json({ product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
}
