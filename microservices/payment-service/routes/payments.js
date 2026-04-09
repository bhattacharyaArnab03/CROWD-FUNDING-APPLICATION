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

router.post("/", async (req, res) => {
  try {
    const { transactionNumber, amount, paymentMethod = "razorpay", donationId, userId, campaignId } = req.body;
    if (!transactionNumber || !amount || !donationId || !userId || !campaignId) {
      return res.status(400).json({ message: "Missing required payment fields." });
    }

    const payment = new Payment({
      transactionNumber,
      amount,
      paymentMethod,
      gatewayResponse: "SUCCESS",
      paymentStatus: "Completed",
      donationId,
      userId,
      campaignId,
    });
    const savedPayment = await payment.save();
    console.log("[Payment Service] Payment completed:", savedPayment);
    res.status(201).json(savedPayment);
  } 
  catch (err) {
    console.error("Payment Error:", err);
    res.status(500).json({ error: "An unexpected error occurred while processing your donation." });
  }
});

export default router;