import { Router } from "express";

import User from "../models/User.js";
import { generateTransactionNumber } from "../utils/generateTransactionNumber.js";

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

  const user = await User.create({
    name,
    email,
    password,
    role: "user",
    totalDonated: 0
  });
  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
});


// Login: set session
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  const user = await User.findOne({ email, password }).lean();
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Set user info in session
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

// Logout: destroy session
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

// Get current user from session
router.get("/me", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and newPassword are required" });
  }

  const user = await User.findOneAndUpdate(
    { email },
    { password: newPassword },
    { new: true }
  );
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "Password has been reset successfully" });
});

export default router;
