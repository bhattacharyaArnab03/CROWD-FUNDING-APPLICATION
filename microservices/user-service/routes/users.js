import { Router } from "express";
import User from "../models/User.js";
import axios from "axios";

const router = Router();

router.get("/", async (req, res) => {
  const users = await User.find().lean();
  res.json(users);
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) 
      return res.status(404).json({ message: "User not found." });
    res.json(user);
  } 
  catch {
    res.status(400).json({ message: "Invalid user ID." });
  }
});

router.get("/:id/donations", async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:5003/api/donations?userId=${req.params.id}`);    
    res.json(response.data);
  }
  catch (err) {
    res.status(400).json({ message: "Invalid user ID or Payment Service unavailable." });
  }
});

router.post("/", async (req, res) => {
  const { name, email, password, role = "user" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Missing required user fields." });
  }

  const exists = await User.findOne({ email });
  if (exists) 
    return res.status(400).json({ message: "Email already exists." });

  const newUser = new User({
    name,
    email,
    password,
    role,
    totalDonated: 0,
  });

  const saved = await newUser.save();
  res.status(201).json(saved);
});

router.patch("/:id/totalDonated", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount) return res.status(400).json({ message: "Invalid amount." });
    
    // Atomic increment solves database race conditions for totalDonated
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { totalDonated: amount } },
      { new: true } // Returns updated record
    );

    if (!user) return res.status(404).json({ message: "User not found." });
    
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Failed to update total donated." });
  }
});

export default router;