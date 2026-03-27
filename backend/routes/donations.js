import { Router } from "express";
import Donation from "../models/Donation.js";

const router = Router();

router.get("/", async (req, res) => {
  const donations = await Donation.find().lean();
  res.json(donations);
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
