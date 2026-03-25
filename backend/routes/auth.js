import { Router } from "express";
import User from "../models/User.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const user = new User({
    transactionNumber: `TXN-${Math.floor(Math.random() * 1000000)}`,
    name,
    email,
    password,
    role: "user",
    totalDonated: 0
  });

  await user.save();
  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  const user = await User.findOne({ email, password }).lean();
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

router.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and newPassword are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: "Password has been reset successfully" });
});

export default router;
