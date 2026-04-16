import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  transactionNumber: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  gatewayResponse: { type: String, default: "PENDING" },
  paymentStatus: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Completed" },
  donationId: { type: mongoose.Schema.Types.ObjectId, ref: "Donation", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Payment", PaymentSchema);
