import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Product from "../../../models/Product";
import mongoose from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { id } = req.query;

  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  switch (req.method) {
    case "GET":
      return handleGet(req, res, id);
    case "PUT":
      return handlePut(req, res, id);
    case "DELETE":
      return handleDelete(req, res, id);
    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    console.log('🔄 PUT Request received for ID:', id);
    console.log('📝 Request body:', req.body);
    
    const { name, price, category, image } = req.body;

    // Validasi input
    if (!name || !price || !category) {
      return res.status(400).json({ error: "Name, price, and category are required" });
    }

    if (typeof price !== "number" || price <= 0) {
      return res.status(400).json({ error: "Price must be a positive number" });
    }

    // Validasi ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    if (name !== currentProduct.name) {
      const existingProduct = await Product.findOne({ name, _id: { $ne: id } });
      if (existingProduct) {
        return res.status(400).json({ error: "Product with this name already exists" });
      }
    } else {
      console.log('ℹ️ Name unchanged, skipping duplicate check');
    }

    // Update produk dengan data baru
    const updateData: any = {
      name,
      price,
      category,
    };

    // Hanya update image jika ada nilai yang diberikan
    if (image !== undefined && image !== null) {
      if (image.trim() === '') {
        updateData.image = undefined;
      } else {
        updateData.image = image;
      }
    }

    console.log('📝 Update data:', updateData);
    console.log('🔄 Updating product with ID:', id);

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      console.log('❌ Product not found during update');
      return res.status(404).json({ error: "Product not found" });
    }

    console.log('✅ Product updated successfully:', updatedProduct.name);
    console.log('📤 Sending response with updated product');

    res.status(200).json({ product: updatedProduct });
  } catch (error) {
    console.error("❌ Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully", product });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
}