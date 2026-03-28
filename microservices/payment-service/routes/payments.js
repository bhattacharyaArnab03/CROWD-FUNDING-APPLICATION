import { Router } from "express";
import Payment from "../models/Payment.js";
import { generatePaymentTransactionId } from "../utils/generateTransactionNumber.js";
const router = Router();
// Endpoint for other services to request a new payment transaction ID
router.get("/generate-transaction-id", (req, res) => {
	const transactionId = generatePaymentTransactionId();
	res.json({ transactionId });
});

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