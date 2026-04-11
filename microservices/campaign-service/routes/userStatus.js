import express from "express";
import mongoose from "mongoose";
// Import the Donation model from payment-service (reuse schema)
import Donation from "../../payment-service/models/Donation.js";

const router = express.Router();

// Returns true if the user is new (recently registered, no donations)
router.get("/is-new/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    // Check if any donation exists for this user
    const hasDonation = await Donation.exists({ userId });
    res.json({ isNew: !hasDonation });
  } catch (err) {
    res.status(500).json({ error: "Failed to check user status" });
  }
});

export default router;
