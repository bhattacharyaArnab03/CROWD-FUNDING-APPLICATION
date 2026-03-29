import { Router } from "express";
import Campaign from "../models/Campaign.js";
import Donation from "../models/Donation.js";

import Payment from "../models/Payment.js";
import User from "../models/User.js";
import { generateTransactionNumber, generatePaymentTransactionId } from "../utils/generateTransactionNumber.js";
import { updateCampaignFields } from "../services/campaignService.js";

const router = Router();

const calculateProgress = (campaign) =>
  Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));

// Update campaign statuses before returning
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

router.get("/:id/donations", async (req, res) => {
  try {
    const donations = await Donation.find({ campaignId: req.params.id }).lean();
    res.json(donations);
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
    goal: Number(goal),
    raised: 0,
    deadline: new Date(deadline),
    status: "Active",
    progress: 0,
    image: image || "",
  });

  const saved = await newCampaign.save();
  res.status(201).json(saved);
});

router.put("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    await updateCampaignFields(campaign, req.body);
    await campaign.save();
    res.json(campaign);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to update campaign.", error: err.message });
  }
});


// Admin: Cancel a campaign
router.post("/:id/cancel", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    campaign.status = "Cancelled";
    await campaign.save();
    res.json({ message: "Campaign cancelled.", campaign });
  } catch (err) {
    res.status(400).json({ message: "Failed to cancel campaign.", error: err.message });
  }
});

export default router;
