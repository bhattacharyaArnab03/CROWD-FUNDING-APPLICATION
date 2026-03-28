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

router.post("/:id/donate", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    const { userId, amount, paymentMethod = "razorpay", userEmail } = req.body;
    const donationAmount = Number(amount);

    if (!userId || !donationAmount || donationAmount <= 0) {
      return res.status(400).json({ message: "Invalid donation payload." });
    }

    const remainingAmount = campaign.goal - campaign.raised;
    if (remainingAmount <= 0) {
      return res.status(400).json({ message: "This campaign is already fully funded." });
    }

    if (donationAmount > remainingAmount) {
      return res.status(400).json({
        message: `Donation exceeds remaining goal amount. You can donate up to ₹${remainingAmount}.`,
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });


    const donation = new Donation({
      transactionNumber: generateTransactionNumber(),
      amount: donationAmount,
      remarks: req.body.remarks || "",
      paymentMethod,
      campaignId: campaign._id,
      userId: user._id,
      userEmail: userEmail || user.email,
      paymentStatus: "Completed",
      transactionId: generatePaymentTransactionId(),
    });

    const savedDonation = await donation.save();

    campaign.raised += donationAmount;
    campaign.progress = calculateProgress(campaign);
    if (campaign.raised >= campaign.goal) {
      campaign.status = "Completed";
    } else if (campaign.deadline < new Date()) {
      campaign.status = "Overdue";
    } else {
      campaign.status = "Active";
    }
    await campaign.save();

    user.totalDonated += donationAmount;
    await user.save();

    const payment = new Payment({
      transactionNumber: savedDonation.transactionNumber,
      amount: donationAmount,
      paymentMethod,
      gatewayResponse: "SUCCESS",
      paymentStatus: "Completed",
      donationId: savedDonation._id,
      userId: user._id,
      campaignId: campaign._id,
    });

    const savedPayment = await payment.save();

    res.json({ campaign, donation: savedDonation, payment: savedPayment });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Donation failed.", error: err.message });
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
