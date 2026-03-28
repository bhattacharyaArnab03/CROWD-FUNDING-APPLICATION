import { Router } from "express";
import Donation from "../models/Donation.js";

const router = Router();

// GET /api/donations?userId=... or /api/donations?userEmail=...
router.get("/", async (req, res) => {
  const { userId, userEmail } = req.query;
  let filter = {};
  if (userId) filter.userId = userId;
  if (userEmail) filter.userEmail = userEmail;

  const donations = await Donation.find(filter)
    .populate("userId")
    .populate("campaignId")
    .lean();

  const history = donations.map((donation) => ({
    _id: donation._id,
    transactionNumber: donation.transactionNumber,
    amount: donation.amount,
    donatedAt: donation.donatedAt,
    userEmail: donation.userEmail || donation.userId?.email,
    donorEmail: donation.userId?.email || donation.userEmail,
    donorName: donation.userId?.name || "Anonymous",
    campaignName: donation.campaignId?.title || donation.campaignId?.name || "Unknown Campaign",
  }));

  res.json(history);
});

router.get("/:id", async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).lean();
    if (!donation) return res.status(404).json({ message: "Donation not found." });
    res.json(donation);
  } catch {
    res.status(400).json({ message: "Invalid donation ID." });
  }
});

export default router;
