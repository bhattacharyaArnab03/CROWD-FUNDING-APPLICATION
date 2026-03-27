import { Router } from "express";
import Payment from "../models/Payment.js";

const router = Router();

router.get("/", async (req, res) => {
  const payments = await Payment.find().lean();
  res.json(payments);
});

router.get("/:id", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).lean();
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    res.json(payment);
  } catch {
    res.status(400).json({ message: "Invalid payment ID." });
  }
});

export default router;
