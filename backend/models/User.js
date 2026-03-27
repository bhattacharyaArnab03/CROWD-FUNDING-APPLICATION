import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  transactionNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  totalDonated: { type: Number, default: 0 },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", UserSchema);
