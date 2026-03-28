import { Router } from "express";
import Campaign from "../models/Campaign.js";
import { generateTransactionNumber, generatePaymentTransactionId } from "../utils/generateTransactionNumber.js";
import { updateCampaignFields } from "../services/campaignService.js";

const router = Router();

const calculateProgress = (campaign) =>
	Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));

router.get("/", async (req, res) => {
	const now = new Date();
	const campaigns = await Campaign.find();
	for (const campaign of campaigns) {
		if (campaign.status !== "Cancelled" && campaign.status !== "Completed") {
			if (campaign.raised >= campaign.goal) {
				if (campaign.status !== "Completed") {
					campaign.status = "Completed";
					await campaign.save();
				}
			} else if (campaign.deadline < now) {
				if (campaign.status !== "Overdue") {
					campaign.status = "Overdue";
					await campaign.save();
				}
			} else if (campaign.status !== "Active") {
				campaign.status = "Active";
				await campaign.save();
			}
		}
	}
	res.json(campaigns.map(c => c.toObject()));
});

router.get("/:id", async (req, res) => {
	try {
		const campaign = await Campaign.findById(req.params.id).lean();
		if (!campaign) return res.status(404).json({ message: "Campaign not found." });
		res.json(campaign);
	} catch {
		res.status(400).json({ message: "Invalid campaign ID." });
	}
});

router.post("/", async (req, res) => {
	const { title, description, goal, deadline, image } = req.body;
	if (!title || !description || !goal || !deadline) {
		return res.status(400).json({ message: "Missing required campaign fields." });
	}

	const newCampaign = new Campaign({
		title,
		description,
		goal,
		deadline,
		image: image || "",
		raised: 0,
		status: "Active",
		progress: 0,
	});

	try {
		const saved = await newCampaign.save();
		res.status(201).json(saved);
	} catch (err) {
		res.status(500).json({ message: "Error creating campaign.", error: err.message });
	}
});

export default router;