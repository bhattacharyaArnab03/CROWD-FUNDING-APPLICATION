import { Router } from "express";
import Donation from "../models/Donation.js";

import fetch from "node-fetch";
const router = Router();
// Example: POST / (create donation, get payment transaction number from payment-service)
router.post("/", async (req, res) => {
	const { amount, remarks, paymentMethod, campaignId, userId, userEmail } = req.body;
	if (!amount || !campaignId || !userId || !userEmail) {
		return res.status(400).json({ message: "Missing required donation fields." });
	}

	// Request a payment transaction number from payment-service
	let transactionId;
	try {
		const response = await fetch("http://localhost:3004/payments/generate-transaction-id");
		const data = await response.json();
		transactionId = data.transactionId;
	} catch (err) {
		return res.status(500).json({ message: "Failed to get payment transaction ID from payment service." });
	}

	const newDonation = new Donation({
		transactionNumber: transactionId, // Use payment-service generated transactionId
		amount,
		remarks,
		paymentMethod: paymentMethod || "razorpay",
		campaignId,
		userId,
		userEmail,
		paymentStatus: "Completed",
		transactionId,
	});

	try {
		const saved = await newDonation.save();
		res.status(201).json(saved);
	} catch (err) {
		res.status(500).json({ message: "Error creating donation.", error: err.message });
	}
});

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