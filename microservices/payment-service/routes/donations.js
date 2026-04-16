import { Router } from "express";
import axios from "axios";
import Donation from "../models/Donation.js";
import { generateTransactionNumber, generatePaymentTransactionId } from "../utils/generateTransactionNumber.js";
import { publishDonationEvent } from "../rabbitmq.js";
import { redisClient, isRedisConnected } from "../redis.js";

const router = Router();

router.get("/", async (req, res) => {
  const start = Date.now();
  try {
    const { userId, userEmail } = req.query;
    let filter = {};
    let cacheKey = "donations_all:v1";
    if (userId) {
      filter.userId = userId;
      cacheKey = `donations_user_${userId}:v1`;
    } else if (userEmail) {
      filter.userEmail = userEmail;
      cacheKey = `donations_email_${userEmail}:v1`;
    }
    // 1. Check Redis Cache First (non-critical)
    let cachedData = null;
    if (isRedisConnected) {
      try {
        cachedData = await redisClient.get(cacheKey);
      } catch (err) {
        console.warn(`[Payment Service][Redis] Redis unavailable, serving from DB.`);
      }
      const elapsed = Date.now() - start;
      if (cachedData) {
        console.log(`[Redis] Cache HIT for key: ${cacheKey} (${elapsed} ms)`);
        return res.json(JSON.parse(cachedData));
      } else {
        console.log(`[Redis] Cache MISS for key: ${cacheKey} (${elapsed} ms)`);
      }
    }
    // 2. DB fetch (critical)
    const donations = await Donation.find(filter).lean();
    const history = await Promise.all(donations.map(async (donation) => {
      let donorEmail = donation.userEmail || "Anonymous";
      let donorName = "Anonymous";
      let campaignName = "Unknown Campaign";
      try {
        if (donation.userId) {
          const user = await Donation.db.collection('users').findOne({ _id: donation.userId });
          if (user) {
            donorEmail = user.email || donorEmail;
            donorName = user.name || donorName;
          }
        }
      } catch (e) { /* ignore */ }
      try {
        if (donation.campaignId) {
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
      redisClient.setEx(cacheKey, 600, JSON.stringify(history))
        .then(() => console.log(`[Redis] Set cache for key: ${cacheKey}`))
        .catch(err => console.error(`[Redis] Error setting key ${cacheKey}:`, err));
    }
  } catch (err) {
    res.status(500).json({ message: "Error fetching history" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).lean();
    if (!donation) 
      return res.status(404).json({ message: "Donation not found." });
    res.json(donation);
  } 
  catch {
    res.status(400).json({ message: "Invalid donation ID." });
  }
});


router.post("/", async (req, res) => {
  const startTime = Date.now();
  console.log("[Payment Service] Processing incoming donation...");
  let lockAcquired = false;
  let distributedLockKey;
  let savedDonation = null;
  let campaign = null;
  let user = null;
  let txnNumber = null;
  try {
    const { campaignId, userId, amount, paymentMethod = "razorpay", userEmail, remarks } = req.body;
    const donationAmount = Number(amount);

    if (!campaignId || !userId || !donationAmount || donationAmount <= 0) {     
      return res.status(400).json({ message: "Invalid donation request. Please check your campaign, user, and amount fields." });
    }

    // Fetch campaign and user, and generate transaction number BEFORE acquiring lock
    try {
      const campRes = await axios.get(`http://localhost:5002/api/campaigns/${campaignId}`);
      campaign = campRes.data;
    } catch (err) {
      console.error(`[Payment Service] Failed to fetch campaign from Campaign Service for campaignId=${campaignId}:`, {
        url: `http://localhost:5002/api/campaigns/${campaignId}`,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        stack: err.stack
      });
      return res.status(404).json({ message: "Campaign not found." });
    }
    try {
      const userRes = await axios.get(`http://localhost:5001/api/users/${userId}`);
      user = userRes.data;
    } catch (err) {
      console.error(`[Payment Service] Failed to fetch user from User Service for userId=${userId}:`, {
        url: `http://localhost:5001/api/users/${userId}`,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        stack: err.stack
      });
      return res.status(404).json({ message: "User not found." });
    }
    let exists = true;
    while (exists) {
      txnNumber = generateTransactionNumber();
      exists = await Donation.exists({ transactionNumber: txnNumber });
    }

    // Acquire lock ONLY for the critical section
    distributedLockKey = `lock:campaign:${campaignId}`;
    if (isRedisConnected) {
      let retries = 5;
      while (retries > 0 && !lockAcquired) {
        try {
          lockAcquired = await redisClient.set(distributedLockKey, "LOCKED", { NX: true, PX: 5000 });
          if (lockAcquired) {
            console.log(`[Redis] Lock ACQUIRED for key: ${distributedLockKey}`);
          }
        } catch (err) {
          console.error(`[Redis] Error acquiring lock for key ${distributedLockKey}:`, err);
        }
        if (!lockAcquired) {
          retries--;
          if (retries > 0) {
            console.log(`[Payment Service] Campaign ${campaignId} is locked. Waiting 500ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      if (!lockAcquired) {
        console.log(`[Payment Service] Spinlock timed out! Rate limiting user for campaign ${campaignId}`);
        return res.status(429).json({ 
          message: "High traffic detected! Another donation is currently processing for this campaign. No funds were deducted. Please try again in a few seconds." 
        });
      }
    }

    // --- CRITICAL SECTION: Only donation/campaign update ---
    try {
      const remainingAmount = campaign.goal - campaign.raised;
      if (remainingAmount <= 0) {
        return res.status(400).json({ message: "This campaign is already fully funded. No funds were deducted." });
      }
      if (donationAmount > remainingAmount) {
        return res.status(400).json({
          message: `Donation exceeds remaining goal amount. You can donate up to ₹${remainingAmount}. Please adjust your donation amount. No funds were deducted.`,
        });
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
      savedDonation = await donation.save();
    } finally {
      // Always release the Redis Distributed Lock so the next person can donate
      if (isRedisConnected && lockAcquired && distributedLockKey) {
        try {
          await redisClient.del(distributedLockKey);
          console.log(`[Redis] Lock RELEASED for key: ${distributedLockKey}`);
        } catch (err) {
          console.error(`[Redis] Error releasing lock for key ${distributedLockKey}:`, err);
        }
      }
    }
    // --- END CRITICAL SECTION ---

    // Clear Cache when a new donation is made to ensure fresh data
    if (isRedisConnected) {
      const actualUserEmail = userEmail || user.email;
      try {
        await redisClient.del(`donations_user_${user._id}:v1`);
        console.log(`[Redis] Deleted key: donations_user_${user._id}:v1`);
      } catch (err) {
        console.error(`[Redis] Error deleting key donations_user_${user._id}:v1:`, err);
      }
      try {
        await redisClient.del(`donations_email_${actualUserEmail}:v1`);
        console.log(`[Redis] Deleted key: donations_email_${actualUserEmail}:v1`);
      } catch (err) {
        console.error(`[Redis] Error deleting key donations_email_${actualUserEmail}:v1:`, err);
      }
      try {
        await redisClient.del("donations_all:v1");
        console.log(`[Redis] Deleted key: donations_all:v1`);
      } catch (err) {
        console.error(`[Redis] Error deleting key donations_all:v1:`, err);
      }
      console.log("[Payment Service] Invalidated Redis cache for fresh history.");
    }

    // Fire & Forget: Event-driven Messaging (RabbitMQ)
    console.log("[Payment Service] Attempting to Dispatch Event to Queue...");
    const eventPayload = {
      campaignId: campaign._id,
      userId: user._id,
      amount: donationAmount
    };
    const isAsyncSent = await publishDonationEvent(eventPayload);

    if (!isAsyncSent) {
      console.warn("[Payment Service] [RabbitMQ] Message Broker Offline! Executing SYNCHRONOUS HTTP fallback...");
      console.warn("[Payment Service] [HTTP Fallback] PATCH http://localhost:5002/api/campaigns/" + campaign._id + "/add-funds", { amount: donationAmount });
      // Fallback: Synchronous HTTP if RabbitMQ is offline
      // 1. Atomically update Campaign Raised Amount
      try {
        const resCamp = await axios.patch(`http://localhost:5002/api/campaigns/${campaign._id}/add-funds`, { amount: donationAmount });
        campaign = resCamp.data; // Sync to return updated campaign explicitly    
      } catch (e) {
        console.error("[Payment Service] Failed to update campaign raised amount atomically:", {
          url: `http://localhost:5002/api/campaigns/${campaign._id}/add-funds`,
          data: { amount: donationAmount },
          status: e.response?.status,
          responseData: e.response?.data,
          message: e.message,
          stack: e.stack
        });
      }

      // 2. Atomically update User Total Donated
      try {
        await axios.patch(`http://localhost:5001/api/users/${user._id}/totalDonated`, { amount: donationAmount });
      } catch (e) {
        console.error("[Payment Service] Failed to update user total donated atomically:", {
          url: `http://localhost:5001/api/users/${user._id}/totalDonated`,
          data: { amount: donationAmount },
          status: e.response?.status,
          responseData: e.response?.data,
          message: e.message,
          stack: e.stack
        });
      }
      console.warn("[Payment Service] Synchronous processing complete. Proceeding to User response...");
    }

    const endTime = Date.now();
    console.log(`[PERFORMANCE] Payment successfully processed. Total HTTP Response Time: ${endTime - startTime}ms`);

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

