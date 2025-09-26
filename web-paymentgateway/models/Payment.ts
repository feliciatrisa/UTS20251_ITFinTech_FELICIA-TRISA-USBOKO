import { Schema, model, models } from "mongoose";

const PaymentSchema = new Schema(
  {
    invoiceId: String,
    amount: Number,
    status: String, // "PAID"
    paidAt: Date,
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default models.Payment || model("Payment", PaymentSchema);
