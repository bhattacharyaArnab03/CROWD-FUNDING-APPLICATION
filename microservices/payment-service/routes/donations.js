
import { Router } from "express";
import axios from "axios";
import Donation from "../models/Donation.js";
import { generateTransactionNumber, generatePaymentTransactionId } from "../utils/generateTransactionNumber.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    let filter = {};
    if (userId) filter.userId = userId;
    if (userEmail) filter.userEmail = userEmail;

    const donations = await Donation.find(filter).lean();

    const history = await Promise.all(donations.map(async (donation) => {
      let donorEmail = donation.userEmail || "Anonymous";
      let donorName = "Anonymous";
      let campaignName = "Unknown Campaign";

      try {
        if (donation.userId) {
          const userRes = await axios.get(`http://localhost:5001/api/users/${donation.userId}`);
          if (userRes.data) {
            donorEmail = userRes.data.email || donorEmail;
            donorName = userRes.data.name || donorName;
          }
        }
      } catch (e) { /* ignore */ }

      try {
        if (donation.campaignId) {
          const campRes = await axios.get(`http://localhost:5002/api/campaigns/${donation.campaignId}`);
          if (campRes.data) {
            campaignName = campRes.data.title || campRes.data.name || campaignName;
          }
        }
      } catch (e) { /* ignore */ }

      return {
        _id: donation._id,
        transactionNumber: donation.transactionNumber,
        amount: donation.amount,
        donatedAt: donation.donatedAt,
        userEmail: donorEmail,
        donorEmail: donorEmail,
        donorName: donorName,
        campaignName: campaignName,
      };
    }));

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Error fetching history" });
  }
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

router.post("/", async (req, res) => {
  try {
    const { campaignId, userId, amount, paymentMethod = "razorpay", userEmail, remarks } = req.body;
    const donationAmount = Number(amount);

    if (!campaignId || !userId || !donationAmount || donationAmount <= 0) {     
      return res.status(400).json({ message: "Invalid donation payload." });    
    }

    let campaign;
    try {
      const campRes = await axios.get(`http://localhost:5002/api/campaigns/${campaignId}`);
      campaign = campRes.data;
    } catch {
      return res.status(404).json({ message: "Campaign not found." });
    }

    const remainingAmount = campaign.goal - campaign.raised;
    if (remainingAmount <= 0) {
      return res.status(400).json({ message: "This campaign is already fully funded." });
    }
    if (donationAmount > remainingAmount) {
      return res.status(400).json({
        message: `Donation exceeds remaining goal amount. You can donate up to ?${remainingAmount}.`,
      });
    }

    let user;
    try {
      const userRes = await axios.get(`http://localhost:5001/api/users/${userId}`);
      user = userRes.data;
    } catch {
      return res.status(404).json({ message: "User not found." });
    }

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

    const newRaised = campaign.raised + donationAmount;
    try {
      await axios.put(`http://localhost:5002/api/campaigns/${campaign._id}`, { raised: newRaised });
    } catch (e) {
      console.log("Failed to update campaign raised amount via inter-service HTTP.");
    }

    try {
      await axios.patch(`http://localhost:5001/api/users/${user._id}/totalDonated`, { amount: donationAmount });
    } catch (e) {
      console.log("Failed to update user total donated via inter-service HTTP.");
    }

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
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Donation failed.", error: err.message });  
  }
});

export default router;

