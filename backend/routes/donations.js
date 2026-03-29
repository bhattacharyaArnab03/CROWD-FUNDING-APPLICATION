import { Router } from "express";
import Donation from "../models/Donation.js";
import Campaign from "../models/Campaign.js";
import User from "../models/User.js";
import { generateTransactionNumber, generatePaymentTransactionId } from "../utils/generateTransactionNumber.js";

const router = Router();

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
    const donation=await Donation.findById(req.params.id).lean();
    if (!donation) 
      return res.status(404).json({ message: "Donation not found." });
    res.json(donation);
  } 
  catch {
    res.status(400).json({ message: "Invalid donation ID." });
  }
});

// POST /api/donations
router.post("/", async (req, res) => {
  try {
    const { campaignId, userId, amount, paymentMethod = "razorpay", userEmail, remarks } = req.body;
    const donationAmount = Number(amount);

    if (!campaignId || !userId || !donationAmount || donationAmount <= 0) {
      return res.status(400).json({ message: "Invalid donation payload." });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) 
      return res.status(404).json({ message: "Campaign not found." });

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
    if (!user) 
      return res.status(404).json({ message: "User not found." });

    let txnNumber;
    let exists = true;
    while (exists) {
      txnNumber = generateTransactionNumber();
      exists = await Donation.exists({ transactionNumber: txnNumber });
    }

    const donation = new Donation({
      transactionNumber: txnNumber,
      amount: donationAmount,
      remarks: remarks || "",
      paymentMethod,
      campaignId: campaign._id,
      userId: user._id,
      userEmail: userEmail || user.email,
      paymentStatus: "Completed",
      transactionId: generatePaymentTransactionId(),
    });
    const savedDonation = await donation.save();

    // Update campaign
    campaign.raised += donationAmount;
    if (campaign.goal > 0) {
      campaign.progress = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
    } else {
      campaign.progress = 0;
    }
    if (campaign.raised >= campaign.goal) {
      campaign.status = "Completed";
    } 
    else if (campaign.deadline < new Date()) {
      campaign.status = "Overdue";
    } 
    else {
      campaign.status = "Active";
    }
    await campaign.save();

    // Update user
    user.totalDonated += donationAmount;
    await user.save();

    // Instead of creating payment here, return donation info and instruct to call payment endpoint
    res.status(201).json({
      campaign,
      donation: savedDonation,
      message: "Donation created. Please create payment using the /api/payments endpoint.",
      paymentPayload: {
        transactionNumber: savedDonation.transactionNumber,
        amount: donationAmount,
        paymentMethod,
        donationId: savedDonation._id,
        userId: user._id,
        campaignId: campaign._id,
      }
    });
  } 
  catch (err) {
    console.error(err);
    res.status(400).json({ message: "Donation failed.", error: err.message });
  }
});

export default router;