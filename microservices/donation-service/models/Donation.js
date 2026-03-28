import mongoose from "mongoose";

const DonationSchema = new mongoose.Schema({
  transactionNumber: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  remarks: { type: String, default: "" },
  paymentMethod: { type: String, default: "razorpay" },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userEmail: { type: String, required: true },
  paymentStatus: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Completed" },
  transactionId: { type: String, required: true, unique: true },
  donatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Donation", DonationSchema);