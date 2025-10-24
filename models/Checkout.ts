import { Schema, model, models, Types } from "mongoose";

const ItemSchema = new Schema({
  productId: { type: Types.ObjectId, ref: "Product", required: true },
  name: String,
  price: Number,
  qty: Number,
});

const CheckoutSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    email: String,
    items: [ItemSchema],
    total: Number,
    status: { type: String, enum: ["PENDING", "LUNAS"], default: "PENDING" },
    invoiceId: String,
    paymentLink: String,
  },
  { timestamps: true }
);

export default models.Checkout || model("Checkout", CheckoutSchema);
