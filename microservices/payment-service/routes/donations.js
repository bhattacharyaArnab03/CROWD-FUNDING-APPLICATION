
import { Router } from "express";
import axios from "axios";
import Donation from "../models/Donation.js";
import { generateTransactionNumber, generatePaymentTransactionId } from "../utils/generateTransactionNumber.js";
import { publishDonationEvent } from "../rabbitmq.js";
import { redisClient, isRedisConnected } from "../redis.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    let filter = {};
    let cacheKey = "donations_all";

    if (userId) {
      filter.userId = userId;
      cacheKey = `donations_user_${userId}`;
    } else if (userEmail) {
      filter.userEmail = userEmail;
      cacheKey = `donations_email_${userEmail}`;
    }

    // 1. Check Redis Cache First
    if (isRedisConnected) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
    }

    const donations = await Donation.find(filter).lean();

    const history = await Promise.all(donations.map(async (donation) => {
      let donorEmail = donation.userEmail || "Anonymous";
      let donorName = "Anonymous";
      let campaignName = "Unknown Campaign";

      try {
        if (donation.userId) {
          // DIRECT DB FETCH: Bypassing HTTP completely for maximum speed
          const user = await Donation.db.collection('users').findOne({ _id: donation.userId });
          if (user) {
            donorEmail = user.email || donorEmail;
            donorName = user.name || donorName;
          }
        }
      } catch (e) { /* ignore */ }

      try {
        if (donation.campaignId) {
          // DIRECT DB FETCH: Bypassing HTTP completely for maximum speed
          const campaign = await Donation.db.collection('campaigns').findOne({ _id: donation.campaignId });
          if (campaign) {
            campaignName = campaign.title || campaign.name || campaignName;
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

    // Send the response INSTANTLY to the user so they don't wait
    res.json(history);

    // 3. Save to Cache in the BACKGROUND (Non-blocking)
    if (isRedisConnected) {
      redisClient.setEx(cacheKey, 300, JSON.stringify(history))
        .catch(err => console.error("Redis background save failed:", err));
    }

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
  const startTime = Date.now();
  console.log("⏱️ [Payment Service] Processing incoming donation...");
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
        message: `Donation exceeds remaining goal amount. You can donate up to ₹${remainingAmount}.`,
      });
    }

    // REDIS DISTRIBUTED LOCK (Mutex) with Spinlock Retry Mechanism
    let lockAcquired = false;
    let distributedLockKey = `lock:campaign:${campaignId}`;
    if (isRedisConnected) {
      let retries = 5; // Will try 5 times, waiting 500ms each = 2.5 seconds max wait Time
      while (retries > 0 && !lockAcquired) {
        // Try to acquire lock. NX = Only set if it DOES NOT exist. PX 5000 = Expire in 5 seconds.
        lockAcquired = await redisClient.set(distributedLockKey, "LOCKED", { NX: true, PX: 5000 });
        
        if (!lockAcquired) {
          retries--;
          if (retries > 0) {
            console.log(`⏳ [Payment Service] Campaign ${campaignId} is locked. Waiting 500ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 500)); // The "Spinlock" wait
          }
        }
      }

      if (!lockAcquired) {
        console.log(`🔒 [Payment Service] Spinlock timed out! Rate limiting user for campaign ${campaignId}`);
        return res.status(429).json({ 
          message: "High traffic detected! Another donation is currently processing for this campaign. Please try again in a few seconds." 
        });
      }
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

    // Clear Cache when a new donation is made to ensure fresh data
    if (isRedisConnected) {
      const actualUserEmail = userEmail || user.email;
      await redisClient.del(`donations_user_${user._id}`);
      await redisClient.del(`donations_email_${actualUserEmail}`);
      await redisClient.del("donations_all");
      console.log("🧹 [Payment Service] Invalidated Redis cache for fresh history.");
    }

    // Fire & Forget: Event-driven Messaging (RabbitMQ)
    console.log("➡️ [Payment Service] Attempting to Dispatch Event to Queue...");
    const isAsyncSent = await publishDonationEvent({
      campaignId: campaign._id,
      userId: user._id,
      amount: donationAmount
    });

    if (!isAsyncSent) {
      console.log("⚠️ [Payment Service] Message Broker Offline! Executing SYNCHRONOUS HTTP blocking fallback...");
      // Fallback: Synchronous HTTP if RabbitMQ is offline
      // 1. Atomically update Campaign Raised Amount
      try {
        const resCamp = await axios.patch(`http://localhost:5002/api/campaigns/${campaign._id}/add-funds`, { amount: donationAmount });
        campaign = resCamp.data; // Sync to return updated campaign explicitly    
      } catch (e) {
        console.log("Failed to update campaign raised amount atomically:", e.message);
      }

      // 2. Atomically update User Total Donated
      try {
        await axios.patch(`http://localhost:5001/api/users/${user._id}/totalDonated`, { amount: donationAmount });
      } catch (e) {
        console.log("Failed to update user total donated atomically:", e.message);
      }
      console.log("⚠️ [Payment Service] Synchronous processing complete. Proceeding to User response...");
    }

    // Release the Redis Distributed Lock so the next person can donate
    if (isRedisConnected && lockAcquired) {
      await redisClient.del(distributedLockKey);
      console.log(`🔓 [Payment Service] Lock released for campaign ${campaignId}`);
    }

    const endTime = Date.now();
    console.log(`🚀 [PERFORMANCE] Payment successfully processed. Total HTTP Response Time: ${endTime - startTime}ms`);

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
    console.error("Payment Error:", err);
    res.status(500).json({ error: "An unexpected error occurred while processing your donation." });  
  }
});

export default router;

