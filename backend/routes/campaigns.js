import { Router } from "express";
import Campaign from "../models/Campaign.js";
import Donation from "../models/Donation.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

const router = Router();

const calculateProgress = (campaign) =>
  Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));

router.get("/", async (req, res) => {
  const campaigns = await Campaign.find().lean();
  res.json(campaigns);
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

router.post("/:id/donate", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    const { userId, amount, paymentMethod = "razorpay", userEmail } = req.body;
    const donationAmount = Number(amount);

    if (!userId || !donationAmount || donationAmount <= 0) {
      return res.status(400).json({ message: "Invalid donation payload." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const donation = new Donation({
      transactionNumber: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: donationAmount,
      remarks: req.body.remarks || "",
      paymentMethod,
      campaignId: campaign._id,
      userId: user._id,
      userEmail: userEmail || user.email,
      paymentStatus: "Completed",
      transactionId: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    const savedDonation = await donation.save();

    campaign.raised += donationAmount;
    campaign.progress = calculateProgress(campaign);
    campaign.status = campaign.raised >= campaign.goal ? "Funded" : "Active";
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

export default router;
