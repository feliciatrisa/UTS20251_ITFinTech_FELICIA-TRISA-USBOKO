import { Schema, model, models } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true }, // IDR
    category: { type: String, required: true },
    image: String,
  },
  { timestamps: true }
);

export default models.Product || model("Product", ProductSchema);
