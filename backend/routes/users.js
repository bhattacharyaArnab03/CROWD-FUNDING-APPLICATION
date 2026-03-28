import { Router } from "express";

import User from "../models/User.js";
import Donation from "../models/Donation.js";
import { generateTransactionNumber } from "../utils/generateTransactionNumber.js";

const router = Router();

router.get("/", async (req, res) => {
  const users = await User.find().lean();
  res.json(users);
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch {
    res.status(400).json({ message: "Invalid user ID." });
  }
});

router.get("/:id/donations", async (req, res) => {
  try {
    const donations = await Donation.find({ userId: req.params.id }).lean();
    res.json(donations);
  } catch {
    res.status(400).json({ message: "Invalid user ID." });
  }
});

router.post("/", async (req, res) => {
  const { name, email, password, role = "user" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Missing required user fields." });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email already exists." });


  const newUser = new User({
    transactionNumber: generateTransactionNumber(),
    name,
    email,
    password,
    role,
    totalDonated: 0,
  });

  const saved = await newUser.save();
  res.status(201).json(saved);
});

export default router;
